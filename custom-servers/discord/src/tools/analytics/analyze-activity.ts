import { Client, GatewayIntentBits, ChannelType, TextChannel, Collection, Message, FetchMessagesOptions } from 'discord.js';
import { BaseDiscordTool, ToolResponse } from '../base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

interface ActivityMetrics {
  totalMessages: number;
  uniqueUsers: number;
  messagesByHour: { [hour: string]: number };
  messagesByDay: { [day: string]: number };
  messagesByChannel: { [channelId: string]: { name: string; count: number } };
  topUsers: { username: string; messageCount: number; percentage: number }[];
  averageMessageLength: number;
  peakHour: { hour: number; count: number };
  peakDay: { day: string; count: number };
  responseMetrics: {
    threadsStarted: number;
    averageThreadLength: number;
    responseRate: number;
  };
}

interface AnalyzeActivityArgs {
  days?: number;
  channelId?: string;
  includeChannelBreakdown?: boolean;
  includeUserBreakdown?: boolean;
  includeTimeAnalysis?: boolean;
}

export class AnalyzeActivityTool extends BaseDiscordTool {
  name = 'discord_analyze_activity';
  description = 'Analyze server activity patterns including user engagement, peak times, and channel distribution';
  category = 'analytics';
  requiredPermissions: string[] = ['ViewChannel', 'ReadMessageHistory'];

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to analyze (default: 7, max: 90)',
            minimum: 1,
            maximum: 90,
            default: 7
          },
          channelId: {
            type: 'string',
            description: 'Specific channel ID to analyze (optional, analyzes all channels if not provided)'
          },
          includeChannelBreakdown: {
            type: 'boolean',
            description: 'Include per-channel activity breakdown (default: true)',
            default: true
          },
          includeUserBreakdown: {
            type: 'boolean',
            description: 'Include top user statistics (default: true)',
            default: true
          },
          includeTimeAnalysis: {
            type: 'boolean',
            description: 'Include peak hour/day analysis (default: true)',
            default: true
          }
        }
      }
    };
  }

  async execute(args: AnalyzeActivityArgs): Promise<ToolResponse> {
    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });

      const days = args.days || 7;
      const targetChannelId = args.channelId;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analysisPromise = new Promise<{ analysis: ActivityMetrics; summary: string }>((resolve, reject) => {
        client.once('ready', async () => {
          try {
            const guild = client.guilds.cache.get(this.context.guildId || '');
            if (!guild) {
              throw new Error('Guild not found or bot not in server');
            }

            // Get channels to analyze
            let channelsToAnalyze: string[] = [];
            if (targetChannelId) {
              channelsToAnalyze = [targetChannelId];
            } else {
              // Get all text channels
              const channels = await guild.channels.fetch();
              channelsToAnalyze = channels
                .filter((channel): channel is TextChannel => 
                  channel !== null && channel.type === ChannelType.GuildText)
                .map(channel => channel.id);
            }

            console.error(`Analyzing ${channelsToAnalyze.length} channels`);

            // Collect all messages from the time period
            const allMessages: Message[] = [];
            const channelNames: { [id: string]: string } = {};

            for (const channelId of channelsToAnalyze) {
              try {
                const channel = await client.channels.fetch(channelId);
                if (!channel || channel.type !== ChannelType.GuildText) continue;

                const textChannel = channel as TextChannel;
                channelNames[channelId] = textChannel.name;
                console.error(`Fetching messages from #${channelNames[channelId]}`);

                // Fetch messages in batches
                let fetchedCount = 0;
                let lastId: string | undefined;
                const maxMessagesPerChannel = 2000; // Reasonable limit

                while (fetchedCount < maxMessagesPerChannel) {
                  const fetchOptions: FetchMessagesOptions = { limit: 100 };
                  if (lastId) fetchOptions.before = lastId;

                  const messagesCollection: Collection<string, Message> = await textChannel.messages.fetch(fetchOptions);
                  if (messagesCollection.size === 0) break;

                  // Filter messages within our date range
                  const relevantMessages = Array.from(messagesCollection.values()).filter((msg: Message) => 
                    msg.createdAt >= startDate && msg.createdAt <= endDate
                  );

                  const lastMessage = messagesCollection.last();
                  if (relevantMessages.length === 0 && lastMessage && lastMessage.createdAt < startDate) {
                    // We've gone past our date range
                    break;
                  }

                  allMessages.push(...relevantMessages);
                  fetchedCount += messagesCollection.size;
                  lastId = messagesCollection.last()?.id;

                  // Small delay to respect rate limits
                  await new Promise(resolve => setTimeout(resolve, 100));
                }

                console.error(`Collected ${allMessages.length} total messages so far`);

              } catch (error) {
                console.error(`Failed to fetch messages from channel ${channelId}:`, error);
                continue;
              }
            }

            if (allMessages.length === 0) {
              const emptyResult = {
                analysis: this.createEmptyMetrics(),
                summary: `No messages found in the specified ${days}-day period.`
              };
              client.destroy();
              resolve(emptyResult);
              return;
            }

            console.error(`Analyzing ${allMessages.length} total messages`);

            // Process messages into metrics
            const metrics = this.processMessages(allMessages, channelNames, args);
            const summary = this.generateSummary(metrics, days);

            client.destroy();
            resolve({ analysis: metrics, summary });

          } catch (error) {
            client.destroy();
            reject(error);
          }
        });

        client.once('error', (error) => {
          client.destroy();
          reject(error);
        });

        setTimeout(() => {
          client.destroy();
          reject(new Error('Activity analysis timeout'));
        }, 30000);
      });

      await client.login(this.context.botToken);
      const result = await analysisPromise;

      return this.createResponse(`📈 Discord Activity Analysis:\n\n${result.summary}\n\n📊 Detailed Metrics:\n${JSON.stringify(result.analysis, null, 2)}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(`Activity analysis failed: ${errorMessage}`);
    }
  }

  private processMessages(messages: Message[], channelNames: { [id: string]: string }, args: AnalyzeActivityArgs): ActivityMetrics {
    const userMessageCounts: { [userId: string]: { username: string; count: number } } = {};
    const messagesByHour: { [hour: string]: number } = {};
    const messagesByDay: { [day: string]: number } = {};
    const messagesByChannel: { [channelId: string]: { name: string; count: number } } = {};
    
    let totalMessageLength = 0;
    const uniqueUsers = new Set<string>();
    const threadStarters = new Set<string>();
    let totalThreadLength = 0;
    let threadCount = 0;

    // Initialize hour buckets
    for (let i = 0; i < 24; i++) {
      messagesByHour[i.toString()] = 0;
    }

    // Initialize day buckets
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    days.forEach(day => messagesByDay[day] = 0);

    messages.forEach(message => {
      const userId = message.author.id;
      const username = message.author.username;
      const channelId = message.channelId;
      const createdAt = new Date(message.createdAt);
      const hour = createdAt.getHours();
      const day = days[createdAt.getDay()];

      // User stats
      uniqueUsers.add(userId);
      if (!userMessageCounts[userId]) {
        userMessageCounts[userId] = { username, count: 0 };
      }
      userMessageCounts[userId].count++;

      // Time stats
      messagesByHour[hour.toString()]++;
      messagesByDay[day]++;

      // Channel stats
      if (!messagesByChannel[channelId]) {
        messagesByChannel[channelId] = { 
          name: channelNames[channelId] || `Unknown Channel`, 
          count: 0 
        };
      }
      messagesByChannel[channelId].count++;

      // Message content stats
      totalMessageLength += message.content.length;

      // Thread analysis (simplified - checking if message is a reply)
      if (message.reference?.messageId) {
        totalThreadLength++;
      } else {
        threadStarters.add(message.id);
        threadCount++;
      }
    });

    // Calculate top users
    const topUsers = Object.values(userMessageCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(user => ({
        username: user.username,
        messageCount: user.count,
        percentage: Math.round((user.count / messages.length) * 100 * 100) / 100
      }));

    // Find peak hour and day
    const peakHour = Object.entries(messagesByHour)
      .reduce((max, [hour, count]) => count > max.count ? { hour: parseInt(hour), count } : max, 
              { hour: 0, count: 0 });

    const peakDay = Object.entries(messagesByDay)
      .reduce((max, [day, count]) => count > max.count ? { day, count } : max, 
              { day: 'Sunday', count: 0 });

    return {
      totalMessages: messages.length,
      uniqueUsers: uniqueUsers.size,
      messagesByHour: args.includeTimeAnalysis !== false ? messagesByHour : {},
      messagesByDay: args.includeTimeAnalysis !== false ? messagesByDay : {},
      messagesByChannel: args.includeChannelBreakdown !== false ? messagesByChannel : {},
      topUsers: args.includeUserBreakdown !== false ? topUsers : [],
      averageMessageLength: Math.round(totalMessageLength / messages.length),
      peakHour,
      peakDay,
      responseMetrics: {
        threadsStarted: threadCount,
        averageThreadLength: threadCount > 0 ? Math.round(totalThreadLength / threadCount * 100) / 100 : 0,
        responseRate: messages.length > 0 ? Math.round((totalThreadLength / messages.length) * 100 * 100) / 100 : 0
      }
    };
  }

  private generateSummary(metrics: ActivityMetrics, days: number): string {
    const avgMessagesPerDay = Math.round(metrics.totalMessages / days);
    const peakHourFormatted = this.formatHour(metrics.peakHour.hour);
    
    let summary = `📈 Activity Analysis (${days} days)\n\n`;
    summary += `📊 Overview:\n`;
    summary += `• Total Messages: ${metrics.totalMessages.toLocaleString()}\n`;
    summary += `• Unique Users: ${metrics.uniqueUsers}\n`;
    summary += `• Daily Average: ${avgMessagesPerDay} messages\n`;
    summary += `• Avg Message Length: ${metrics.averageMessageLength} characters\n\n`;

    if (Object.keys(metrics.messagesByHour).length > 0) {
      summary += `⏰ Peak Activity:\n`;
      summary += `• Peak Hour: ${peakHourFormatted} (${metrics.peakHour.count} messages)\n`;
      summary += `• Peak Day: ${metrics.peakDay.day} (${metrics.peakDay.count} messages)\n\n`;
    }

    if (metrics.topUsers.length > 0) {
      summary += `👥 Top Contributors:\n`;
      metrics.topUsers.slice(0, 5).forEach((user, index) => {
        summary += `${index + 1}. ${user.username}: ${user.messageCount} messages (${user.percentage}%)\n`;
      });
      summary += `\n`;
    }

    if (Object.keys(metrics.messagesByChannel).length > 0) {
      const sortedChannels = Object.entries(metrics.messagesByChannel)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 5);
      
      summary += `📺 Most Active Channels:\n`;
      sortedChannels.forEach(([channelId, data], index) => {
        const percentage = Math.round((data.count / metrics.totalMessages) * 100 * 100) / 100;
        summary += `${index + 1}. #${data.name}: ${data.count} messages (${percentage}%)\n`;
      });
      summary += `\n`;
    }

    summary += `💬 Engagement:\n`;
    summary += `• Threads Started: ${metrics.responseMetrics.threadsStarted}\n`;
    summary += `• Avg Thread Length: ${metrics.responseMetrics.averageThreadLength} messages\n`;
    summary += `• Response Rate: ${metrics.responseMetrics.responseRate}%`;

    return summary;
  }

  private formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }

  private createEmptyMetrics(): ActivityMetrics {
    return {
      totalMessages: 0,
      uniqueUsers: 0,
      messagesByHour: {},
      messagesByDay: {},
      messagesByChannel: {},
      topUsers: [],
      averageMessageLength: 0,
      peakHour: { hour: 0, count: 0 },
      peakDay: { day: 'Sunday', count: 0 },
      responseMetrics: {
        threadsStarted: 0,
        averageThreadLength: 0,
        responseRate: 0
      }
    };
  }
}
