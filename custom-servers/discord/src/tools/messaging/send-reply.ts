import { Client, GatewayIntentBits, ChannelType, TextChannel } from 'discord.js';
import { BaseDiscordTool } from '../base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class SendReplyTool extends BaseDiscordTool {
  name = 'discord_send_reply';
  description = 'Reply to a specific message in a Discord channel with context preservation';
  category = 'messaging';
  requiredPermissions: string[] = ['ViewChannel', 'SendMessages', 'ReadMessageHistory'];

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          channelId: {
            type: 'string',
            description: 'The ID of the channel containing the message to reply to'
          },
          messageId: {
            type: 'string',
            description: 'The ID of the message to reply to'
          },
          content: {
            type: 'string',
            description: 'The reply content to send'
          },
          allowMentions: {
            type: 'boolean',
            description: 'Allow @mentions in the reply (default: false for safety)'
          },
          includeContext: {
            type: 'boolean',
            description: 'Include a brief quote of the original message for context (default: true)'
          }
        },
        required: ['channelId', 'messageId', 'content']
      }
    };
  }

  async execute(args: {
    channelId: string;
    messageId: string;
    content: string;
    allowMentions?: boolean;
    includeContext?: boolean;
  }): Promise<any> {
    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });

      const allowMentions = args.allowMentions || false;
      const includeContext = args.includeContext !== false;

      const replyPromise = new Promise((resolve, reject) => {
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

            // Fetch the original message to reply to
            let originalMessage;
            try {
              originalMessage = await textChannel.messages.fetch(args.messageId);
            } catch (fetchError) {
              throw new Error(`Could not find message ${args.messageId} in channel ${textChannel.name}`);
            }

            // Process reply content
            let replyContent = this.processMessageContent(args.content, allowMentions);

            // Add context quote if requested and original message has content
            if (includeContext && originalMessage.content) {
              const contextQuote = this.createContextQuote(originalMessage.content, originalMessage.author.username);
              replyContent = `${contextQuote}\n\n${replyContent}`;
            }

            // Split message if too long
            const messages = this.splitLongMessage(replyContent);
            const sentMessages = [];

            // Send reply message(s)
            for (let i = 0; i < messages.length; i++) {
              const messageContent = messages[i];
              
              const sendOptions: any = {
                content: messageContent,
                allowedMentions: {
                  parse: allowMentions ? ['users', 'roles'] : [],
                  repliedUser: true
                }
              };

              // Add reply reference for first message
              if (i === 0) {
                sendOptions.reply = {
                  messageReference: args.messageId,
                  failIfNotExists: false
                };
              }

              const sentMessage = await textChannel.send(sendOptions);
              sentMessages.push({
                id: sentMessage.id,
                content: sentMessage.content,
                timestamp: sentMessage.createdAt.toISOString(),
                url: sentMessage.url
              });

              // Small delay between multiple messages
              if (i < messages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }

            const result = {
              success: true,
              channelInfo: {
                id: textChannel.id,
                name: textChannel.name,
                guildName: textChannel.guild.name
              },
              originalMessage: {
                id: originalMessage.id,
                author: originalMessage.author.username,
                content: originalMessage.content.substring(0, 100) + (originalMessage.content.length > 100 ? '...' : ''),
                timestamp: originalMessage.createdAt.toISOString()
              },
              replySent: {
                messagesSent: sentMessages.length,
                messages: sentMessages,
                wasSplit: messages.length > 1,
                includedContext: includeContext && originalMessage.content.length > 0
              }
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
          reject(new Error('Reply sending timeout'));
        }, 10000);
      });

      await client.login(this.context.botToken);
      const result = await replyPromise;

      return {
        content: [
          {
            type: 'text',
            text: `💬 Reply Sent Successfully!\n\n${JSON.stringify(result, null, 2)}`
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to send reply: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }

  private createContextQuote(originalContent: string, authorUsername: string): string {
    // Create a shortened quote for context
    const maxQuoteLength = 100;
    let quote = originalContent.length > maxQuoteLength 
      ? originalContent.substring(0, maxQuoteLength) + '...'
      : originalContent;
    
    // Clean up the quote (remove excessive whitespace)
    quote = quote.replace(/\n+/g, ' ').trim();
    
    return `> **${authorUsername}:** ${quote}`;
  }

  private processMessageContent(content: string, allowMentions: boolean): string {
    let processed = content;

    // Safety: Disable @everyone and @here mentions unless explicitly allowed
    if (!allowMentions) {
      processed = processed
        .replace(/@everyone/g, '@\u200beveryone')
        .replace(/@here/g, '@\u200bhere');
    }

    // Clean up excessive whitespace
    processed = processed
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .trim();

    return processed;
  }

  private splitLongMessage(content: string): string[] {
    const MAX_LENGTH = 1900; // Leave room for Discord formatting
    
    if (content.length <= MAX_LENGTH) {
      return [content];
    }

    const messages: string[] = [];
    let remaining = content;

    while (remaining.length > 0) {
      if (remaining.length <= MAX_LENGTH) {
        messages.push(remaining);
        break;
      }

      // Find a good break point (prefer sentence endings, then word boundaries)
      let breakPoint = MAX_LENGTH;
      
      // Look for sentence endings
      const sentenceEnd = remaining.lastIndexOf('.', MAX_LENGTH);
      const questionEnd = remaining.lastIndexOf('?', MAX_LENGTH);
      const exclamationEnd = remaining.lastIndexOf('!', MAX_LENGTH);
      
      const bestSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
      
      if (bestSentenceEnd > MAX_LENGTH * 0.7) { // Don't break too early
        breakPoint = bestSentenceEnd + 1;
      } else {
        // Look for word boundaries
        const spaceIndex = remaining.lastIndexOf(' ', MAX_LENGTH);
        const newlineIndex = remaining.lastIndexOf('\n', MAX_LENGTH);
        
        const bestWordBreak = Math.max(spaceIndex, newlineIndex);
        if (bestWordBreak > MAX_LENGTH * 0.5) {
          breakPoint = bestWordBreak;
        }
      }

      messages.push(remaining.substring(0, breakPoint).trim());
      remaining = remaining.substring(breakPoint).trim();
    }

    return messages;
  }
}