import { Client, GatewayIntentBits, ChannelType, TextChannel, Collection, Message, FetchMessagesOptions } from 'discord.js';
import { BaseDiscordTool } from '../base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

interface SearchResult {
  id: string;
  author: {
    username: string;
    id: string;
    displayName: string;
  };
  content: string;
  timestamp: string;
  matchedText: string;
  matchType: 'content' | 'author' | 'metadata';
  url: string;
}

export class SearchMessagesTool extends BaseDiscordTool {
  name = 'discord_search_messages';
  description = 'Search for messages in a Discord channel with regex support and advanced filtering';
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
            description: 'The ID of the channel to search in'
          },
          query: {
            type: 'string',
            description: 'Search query (supports regex if wrapped in /pattern/flags, wildcards with *, or plain text)'
          },
          authorId: {
            type: 'string',
            description: 'Optional: Filter by specific user ID'
          },
          hasAttachments: {
            type: 'boolean',
            description: 'Optional: Filter for messages with attachments'
          },
          hasEmbeds: {
            type: 'boolean',
            description: 'Optional: Filter for messages with embeds'
          },
          dateAfter: {
            type: 'string',
            description: 'Optional: Only include messages after this date (ISO format)'
          },
          dateBefore: {
            type: 'string',
            description: 'Optional: Only include messages before this date (ISO format)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (1-50, default: 25)',
            minimum: 1,
            maximum: 50
          },
          searchDepth: {
            type: 'number',
            description: 'Number of messages to search through (50-500, default: 200)',
            minimum: 50,
            maximum: 500
          }
        },
        required: ['channelId']
      }
    };
  }

  async execute(args: {
    channelId: string;
    query?: string;
    authorId?: string;
    hasAttachments?: boolean;
    hasEmbeds?: boolean;
    dateAfter?: string;
    dateBefore?: string;
    limit?: number;
    searchDepth?: number;
  }): Promise<any> {
    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });

      const limit = Math.min(Math.max(args.limit || 25, 1), 50);
      const searchDepth = Math.min(Math.max(args.searchDepth || 200, 50), 500);

      const searchPromise = new Promise((resolve, reject) => {
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

            // Fetch messages to search through
            const messages = await this.fetchMessagesForSearch(textChannel, searchDepth);
            
            // Apply filters and search
            const filteredMessages = this.filterMessages(messages, args);
            const searchResults = this.searchMessages(filteredMessages, args.query);

            // Limit results
            const limitedResults = searchResults.slice(0, limit);

            // Generate analytics
            const analytics = this.generateSearchAnalytics(searchResults, messages.length);

            const result = {
              channelInfo: {
                id: textChannel.id,
                name: textChannel.name,
                guildName: textChannel.guild.name
              },
              searchParameters: {
                query: args.query || 'No text query',
                authorId: args.authorId,
                hasAttachments: args.hasAttachments,
                hasEmbeds: args.hasEmbeds,
                dateAfter: args.dateAfter,
                dateBefore: args.dateBefore,
                searchDepth: searchDepth,
                resultLimit: limit
              },
              results: {
                totalFound: searchResults.length,
                returned: limitedResults.length,
                searchedMessages: messages.length,
                messages: limitedResults
              },
              analytics
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
          reject(new Error('Message search timeout'));
        }, 20000);
      });

      await client.login(this.context.botToken);
      const result = await searchPromise;

      return {
        content: [
          {
            type: 'text',
            text: `🔍 Message Search Results:\n\n${JSON.stringify(result, null, 2)}`
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to search messages: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }

  private async fetchMessagesForSearch(channel: TextChannel, depth: number): Promise<Message[]> {
    const messages: Message[] = [];
    let lastMessageId: string | undefined;

    while (messages.length < depth) {
      const fetchOptions: FetchMessagesOptions = {
        limit: Math.min(100, depth - messages.length)
      };
      
      if (lastMessageId) {
        fetchOptions.before = lastMessageId;
      }

      const fetchedMessages = await channel.messages.fetch(fetchOptions);
      if (fetchedMessages.size === 0) break;

      const messageArray = Array.from(fetchedMessages.values());
      messages.push(...messageArray);
      lastMessageId = messageArray[messageArray.length - 1].id;
    }

    return messages;
  }

  private filterMessages(messages: Message[], filters: any): Message[] {
    return messages.filter(message => {
      // Author filter
      if (filters.authorId && message.author.id !== filters.authorId) {
        return false;
      }

      // Attachment filter
      if (filters.hasAttachments !== undefined) {
        const hasAttachments = message.attachments.size > 0;
        if (filters.hasAttachments !== hasAttachments) return false;
      }

      // Embed filter
      if (filters.hasEmbeds !== undefined) {
        const hasEmbeds = message.embeds.length > 0;
        if (filters.hasEmbeds !== hasEmbeds) return false;
      }

      // Date filters
      if (filters.dateAfter) {
        const afterDate = new Date(filters.dateAfter);
        if (message.createdAt < afterDate) return false;
      }

      if (filters.dateBefore) {
        const beforeDate = new Date(filters.dateBefore);
        if (message.createdAt > beforeDate) return false;
      }

      return true;
    });
  }

  private searchMessages(messages: Message[], query?: string): SearchResult[] {
    if (!query) {
      // No text query, return all filtered messages
      return messages.map(msg => this.messageToSearchResult(msg, '', 'metadata'));
    }

    const searchPattern = this.createSearchPattern(query);
    const results: SearchResult[] = [];

    for (const message of messages) {
      const contentMatch = this.testPattern(searchPattern, message.content);
      const authorMatch = this.testPattern(searchPattern, message.author.username);

      if (contentMatch.matched) {
        results.push(this.messageToSearchResult(message, contentMatch.matchText, 'content'));
      } else if (authorMatch.matched) {
        results.push(this.messageToSearchResult(message, authorMatch.matchText, 'author'));
      }
    }

    return results;
  }

  private createSearchPattern(query: string): { type: 'regex' | 'wildcard' | 'text'; pattern: RegExp | string } {
    // Regex pattern: /pattern/flags
    const regexMatch = query.match(/^\/(.+)\/([gimuy]*)$/);
    if (regexMatch) {
      try {
        return {
          type: 'regex',
          pattern: new RegExp(regexMatch[1], regexMatch[2])
        };
      } catch (error) {
        // Invalid regex, fall back to text search
        console.error('Invalid regex pattern, falling back to text search');
      }
    }

    // Wildcard pattern: contains * or ?
    if (query.includes('*') || query.includes('?')) {
      const regexPattern = query
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
        .replace(/\\\*/g, '.*') // Convert * to .*
        .replace(/\\\?/g, '.'); // Convert ? to .
      
      return {
        type: 'wildcard',
        pattern: new RegExp(regexPattern, 'i')
      };
    }

    // Plain text search
    return {
      type: 'text',
      pattern: query.toLowerCase()
    };
  }

  private testPattern(searchPattern: any, text: string): { matched: boolean; matchText: string } {
    if (!text) return { matched: false, matchText: '' };

    if (searchPattern.type === 'text') {
      const matched = text.toLowerCase().includes(searchPattern.pattern);
      return { 
        matched, 
        matchText: matched ? text.substring(0, 50) + (text.length > 50 ? '...' : '') : ''
      };
    } else {
      // Regex or wildcard (both use RegExp)
      const match = text.match(searchPattern.pattern);
      return {
        matched: !!match,
        matchText: match ? match[0] : ''
      };
    }
  }

  private messageToSearchResult(message: Message, matchedText: string, matchType: 'content' | 'author' | 'metadata'): SearchResult {
    return {
      id: message.id,
      author: {
        username: message.author.username,
        id: message.author.id,
        displayName: message.member?.displayName || message.author.displayName
      },
      content: message.content,
      timestamp: message.createdAt.toISOString(),
      matchedText,
      matchType,
      url: message.url
    };
  }

  private generateSearchAnalytics(results: SearchResult[], totalSearched: number) {
    const authorCounts = new Map<string, number>();
    const matchTypeCounts = { content: 0, author: 0, metadata: 0 };
    
    results.forEach(result => {
      const count = authorCounts.get(result.author.username) || 0;
      authorCounts.set(result.author.username, count + 1);
      matchTypeCounts[result.matchType]++;
    });

    const topAuthors = Array.from(authorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([username, count]) => ({ username, count }));

    return {
      totalSearched,
      matchDistribution: matchTypeCounts,
      topAuthors,
      timeRange: results.length > 0 ? {
        earliest: results[results.length - 1]?.timestamp,
        latest: results[0]?.timestamp
      } : null
    };
  }
}