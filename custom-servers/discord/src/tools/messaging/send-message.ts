import { Client, GatewayIntentBits, ChannelType, TextChannel } from 'discord.js';
import { BaseDiscordTool } from '../base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class SendMessageTool extends BaseDiscordTool {
  name = 'discord_send_message';
  description = 'Send a message to a Discord channel with smart formatting and content validation';
  category = 'messaging';
  requiredPermissions: string[] = ['ViewChannel', 'SendMessages'];

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          channelId: {
            type: 'string',
            description: 'The ID of the channel to send the message to'
          },
          content: {
            type: 'string',
            description: 'The message content to send (will be truncated to Discord\'s 2000 character limit)'
          },
          replyTo: {
            type: 'string',
            description: 'Optional: Message ID to reply to'
          },
          allowMentions: {
            type: 'boolean',
            description: 'Allow @mentions in the message (default: false for safety)'
          }
        },
        required: ['channelId', 'content']
      }
    };
  }

  async execute(args: {
    channelId: string;
    content: string;
    replyTo?: string;
    allowMentions?: boolean;
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

      const sendPromise = new Promise((resolve, reject) => {
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

            // Process and validate content
            let processedContent = this.processMessageContent(args.content, allowMentions);
            
            // Check if content needs to be split
            const messages = this.splitLongMessage(processedContent);
            const sentMessages = [];

            // Send message(s)
            for (let i = 0; i < messages.length; i++) {
              const messageContent = messages[i];
              
              const sendOptions: any = {
                content: messageContent,
                allowedMentions: {
                  parse: allowMentions ? ['users', 'roles'] : [],
                  repliedUser: true
                }
              };

              // Add reply reference for first message if specified
              if (args.replyTo && i === 0) {
                sendOptions.reply = {
                  messageReference: args.replyTo,
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

              // Small delay between multiple messages to avoid rate limiting
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
              messagesSent: sentMessages.length,
              messages: sentMessages,
              originalLength: args.content.length,
              processedLength: processedContent.length,
              wasSplit: messages.length > 1,
              replyTo: args.replyTo || null
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
          reject(new Error('Message sending timeout'));
        }, 10000);
      });

      await client.login(this.context.botToken);
      const result = await sendPromise;

      return {
        content: [
          {
            type: 'text',
            text: `📤 Message Sent Successfully!\n\n${JSON.stringify(result, null, 2)}`
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to send message: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
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