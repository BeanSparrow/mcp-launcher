import { Client, GatewayIntentBits, Message, ChannelType, TextChannel, Collection, FetchMessagesOptions } from 'discord.js';
import { BaseDiscordTool } from '../base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

interface ParsedMessage {
  id: string;
  author: {
    username: string;
    id: string;
    displayName: string;
    bot: boolean;
  };
  content: string;
  rawContent: string;
  timestamp: string;
  editedTimestamp: string | null;
  attachments: string[];
  embeds: number;
  reactions: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
  replyTo: string | null;
  mentions: {
    users: Array<{ username: string; id: string; }>;
    channels: Array<{ name: string; id: string; }>;
    roles: Array<{ name: string; id: string; }>;
    urls: string[];
  };
  thread?: {
    messageCount: number;
    depth: number;
    parentId: string;
  };
}

export class ReadMessagesTool extends BaseDiscordTool {
  name = 'discord_read_messages';
  description = 'Read recent messages from a Discord channel with full conversation threading and metadata';
  category = 'messaging';
  requiredPermissions: string[] = ['ViewChannel', 'ReadMessageHistory'];

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          channelId: {
            type: 'string',
            description: 'The ID of the channel to read messages from'
          },
          limit: {
            type: 'number',
            description: 'Number of messages to read (1-100, default: 25)',
            minimum: 1,
            maximum: 100
          },
          before: {
            type: 'string',
            description: 'Message ID to read messages before (for pagination)'
          },
          after: {
            type: 'string',
            description: 'Message ID to read messages after (for pagination)'
          },
          includeMetadata: {
            type: 'boolean',
            description: 'Include detailed metadata and conversation threading (default: true)'
          }
        },
        required: ['channelId']
      }
    };
  }

  async execute(args: {
    channelId: string;
    limit?: number;
    before?: string;
    after?: string;
    includeMetadata?: boolean;
  }): Promise<any> {
    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });

      const limit = Math.min(Math.max(args.limit || 25, 1), 100);
      const includeMetadata = args.includeMetadata !== false;

      const messagesPromise = new Promise((resolve, reject) => {
        client.once('ready', async () => {
          try {
            const channel = client.channels.cache.get(args.channelId);
            if (!channel) {
              throw new Error(`Channel not found or bot doesn't have access: ${args.channelId}`);
            }

            if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
              throw new Error(`Channel must be a text channel. Found type: ${ChannelType[channel.type]}`);
            }

            const textChannel = channel as TextChannel;

            // Fetch messages with proper typing to ensure Collection return type
            const fetchOptions: FetchMessagesOptions = { limit };
            if (args.before) fetchOptions.before = args.before;
            if (args.after) fetchOptions.after = args.after;

            const messagesCollection = await textChannel.messages.fetch(fetchOptions);
            const messageArray = Array.from(messagesCollection.values()).reverse(); // Discord returns newest first, we want chronological

            // Parse all messages
            const parsedMessages: ParsedMessage[] = await Promise.all(
              messageArray.map(async (msg) => await this.parseMessage(msg, includeMetadata))
            );

            // Build conversation threads if metadata is enabled
            let conversationThreads: any = null;
            if (includeMetadata) {
              conversationThreads = this.buildConversationThreads(parsedMessages);
            }

            const result = {
              channelInfo: {
                id: textChannel.id,
                name: textChannel.name,
                guildName: textChannel.guild.name,
                topic: textChannel.topic
              },
              messageCount: parsedMessages.length,
              limit: limit,
              pagination: {
                before: args.before || null,
                after: args.after || null,
                hasMore: messagesCollection.size === limit
              },
              messages: parsedMessages,
              ...(includeMetadata && {
                analytics: {
                  uniqueUsers: new Set(parsedMessages.map(m => m.author.id)).size,
                  totalReactions: parsedMessages.reduce((sum, m) => sum + m.reactions.reduce((rSum, r) => rSum + r.count, 0), 0),
                  messagesWithAttachments: parsedMessages.filter(m => m.attachments.length > 0).length,
                  messagesWithEmbeds: parsedMessages.filter(m => m.embeds > 0).length,
                  editedMessages: parsedMessages.filter(m => m.editedTimestamp).length
                },
                conversationThreads
              })
            };

            client.destroy();
            resolve(result);
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
          reject(new Error('Message reading timeout'));
        }, 15000);
      });

      await client.login(this.context.botToken);
      const result = await messagesPromise;

      return {
        content: [
          {
            type: 'text',
            text: `📨 Discord Messages:\n\n${JSON.stringify(result, null, 2)}`
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to read messages: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }

  private async parseMessage(message: Message, includeMetadata: boolean): Promise<ParsedMessage> {
    const parsedMessage: ParsedMessage = {
      id: message.id,
      author: {
        username: message.author.username,
        id: message.author.id,
        displayName: message.member?.displayName || message.author.displayName,
        bot: message.author.bot
      },
      content: this.parseMarkdown(message.content),
      rawContent: message.content,
      timestamp: message.createdAt.toISOString(),
      editedTimestamp: message.editedAt?.toISOString() || null,
      attachments: message.attachments.map(att => att.name || att.url.split('/').pop() || 'unknown'),
      embeds: message.embeds.length,
      reactions: Array.from(message.reactions.cache.values()).map(reaction => ({
        emoji: reaction.emoji.name || reaction.emoji.toString(),
        count: reaction.count,
        users: Array.from(reaction.users.cache.values()).map(user => user.username)
      })),
      replyTo: message.reference?.messageId || null,
      mentions: {
        users: Array.from(message.mentions.users.values()).map(user => ({
          username: user.username,
          id: user.id
        })),
        channels: Array.from(message.mentions.channels.values()).map(channel => ({
          name: (channel as TextChannel).name || 'unknown-channel',
          id: channel.id
        })),
        roles: Array.from(message.mentions.roles.values()).map(role => ({
          name: role.name,
          id: role.id
        })),
        urls: this.extractUrls(message.content)
      }
    };

    return parsedMessage;
  }

  private parseMarkdown(content: string): string {
    if (!content) return '';
    
    // Convert Discord markdown to readable format
    let parsed = content
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '**$1**')
      // Italic
      .replace(/\*(.*?)\*/g, '*$1*')
      // Underline
      .replace(/__(.*?)__/g, '__$1__')
      // Strikethrough
      .replace(/~~(.*?)~~/g, '~~$1~~')
      // Code blocks
      .replace(/```(.*?)```/gs, '```$1```')
      // Inline code
      .replace(/`(.*?)`/g, '`$1`')
      // Spoilers
      .replace(/\|\|(.*?)\|\|/g, '||$1||')
      // User mentions
      .replace(/<@!?(\d+)>/g, '@user($1)')
      // Channel mentions  
      .replace(/<#(\d+)>/g, '#channel($1)')
      // Role mentions
      .replace(/<@&(\d+)>/g, '@role($1)')
      // Custom emojis
      .replace(/<a?:(\w+):(\d+)>/g, ':$1:')
      // Timestamps
      .replace(/<t:(\d+):?([tTdDfFR])?>/g, (match, timestamp, format) => {
        const date = new Date(parseInt(timestamp) * 1000);
        return `[${date.toISOString()}]`;
      });

    return parsed;
  }

  private extractUrls(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = content.match(urlRegex);
    return matches || [];
  }

  private buildConversationThreads(messages: ParsedMessage[]): any {
    const threads: any = {};
    const messageMap = new Map(messages.map(msg => [msg.id, msg]));

    for (const message of messages) {
      if (message.replyTo) {
        const parentId = message.replyTo;
        if (!threads[parentId]) {
          threads[parentId] = {
            rootMessage: messageMap.get(parentId),
            replies: [],
            depth: 1
          };
        }
        threads[parentId].replies.push(message);
        
        // Add thread info to the message
        message.thread = {
          messageCount: threads[parentId].replies.length + 1,
          depth: 1, // Could be enhanced for nested replies
          parentId: parentId
        };
      }
    }

    return threads;
  }
}