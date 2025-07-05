import { Client, GatewayIntentBits, ChannelType, GuildBasedChannel, TextChannel, VoiceChannel, CategoryChannel } from 'discord.js';
import { BaseDiscordTool } from '../base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class GetChannelInfoTool extends BaseDiscordTool {
  name = 'discord_get_channel_info';
  description = 'Get detailed information about a specific Discord channel';
  category = 'channels';
  requiredPermissions: string[] = ['ViewChannel']; // Need to view channels

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          channelId: {
            type: 'string',
            description: 'The ID of the channel to get information about'
          },
          includePermissions: {
            type: 'boolean',
            description: 'Include bot permissions for this channel (default: true)'
          },
          includeRecentActivity: {
            type: 'boolean',
            description: 'Include recent activity statistics (default: false)'
          }
        },
        required: ['channelId']
      }
    };
  }

  async execute(args: { 
    channelId: string; 
    includePermissions?: boolean; 
    includeRecentActivity?: boolean;
  }): Promise<any> {
    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages
        ]
      });

      const channelInfoPromise = new Promise((resolve, reject) => {
        client.once('ready', async () => {
          try {
            const channel = client.channels.cache.get(args.channelId) as GuildBasedChannel;
            if (!channel) {
              throw new Error(`Channel not found or bot doesn't have access: ${args.channelId}`);
            }

            if (!channel.guild) {
              throw new Error('Channel is not in a guild (DM channels not supported)');
            }

            const guild = channel.guild;
            const baseInfo = {
              id: channel.id,
              name: channel.name,
              type: ChannelType[channel.type],
              guildId: guild.id,
              guildName: guild.name,
              position: 'position' in channel ? channel.position : 0,
              createdAt: channel.createdAt?.toISOString()
            };

            let additionalInfo: any = {};

            // Add type-specific information
            if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
              const textChannel = channel as TextChannel;
              additionalInfo = {
                topic: textChannel.topic || null,
                nsfw: textChannel.nsfw || false,
                rateLimitPerUser: textChannel.rateLimitPerUser || 0,
                parentId: textChannel.parentId,
                parentName: textChannel.parent?.name || null
              };
            } else if (channel.type === ChannelType.GuildVoice) {
              const voiceChannel = channel as VoiceChannel;
              additionalInfo = {
                bitrate: voiceChannel.bitrate,
                userLimit: voiceChannel.userLimit,
                rtcRegion: voiceChannel.rtcRegion,
                parentId: voiceChannel.parentId,
                parentName: voiceChannel.parent?.name || null,
                currentUsers: voiceChannel.members?.size || 0
              };
            } else if (channel.type === ChannelType.GuildCategory) {
              const categoryChannel = channel as CategoryChannel;
              const childChannels = guild.channels.cache.filter((c: GuildBasedChannel) => c.parentId === channel.id);
              additionalInfo = {
                childChannelsCount: childChannels.size,
                childChannels: Array.from(childChannels.values()).map((c: GuildBasedChannel) => ({
                  id: c.id,
                  name: c.name,
                  type: ChannelType[c.type]
                }))
              };
            }

            // Get bot permissions if requested
            let permissions = null;
            if (args.includePermissions !== false) {
              try {
                const botMember = await guild.members.fetch(client.user!.id);
                const channelPerms = channel.permissionsFor(botMember);
                if (channelPerms) {
                  permissions = {
                    canRead: channelPerms.has('ViewChannel'),
                    canSendMessages: channelPerms.has('SendMessages'),
                    canReadHistory: channelPerms.has('ReadMessageHistory'),
                    canEmbedLinks: channelPerms.has('EmbedLinks'),
                    canAttachFiles: channelPerms.has('AttachFiles'),
                    canManageMessages: channelPerms.has('ManageMessages'),
                    allPermissions: channelPerms.toArray()
                  };
                }
              } catch (permError) {
                permissions = { error: 'Could not fetch permissions' };
              }
            }

            // Get recent activity if requested
            let recentActivity = null;
            if (args.includeRecentActivity && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)) {
              try {
                const textChannel = channel as TextChannel;
                const messages = await textChannel.messages.fetch({ limit: 50 });
                const now = Date.now();
                const oneDayAgo = now - (24 * 60 * 60 * 1000);
                const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

                const recentMessages = messages.filter(msg => msg.createdTimestamp > oneDayAgo);
                const weekMessages = messages.filter(msg => msg.createdTimestamp > oneWeekAgo);

                recentActivity = {
                  messagesLast24h: recentMessages.size,
                  messagesLastWeek: weekMessages.size,
                  lastMessageAt: messages.first()?.createdAt?.toISOString() || null,
                  uniqueUsersLast24h: new Set(recentMessages.map(msg => msg.author.id)).size
                };
              } catch (activityError) {
                recentActivity = { error: 'Could not fetch recent activity' };
              }
            }

            const result = {
              ...baseInfo,
              ...additionalInfo,
              permissions,
              recentActivity
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
          reject(new Error('Channel info retrieval timeout'));
        }, 15000);
      });

      await client.login(this.context.botToken);
      const result = await channelInfoPromise;

      return {
        content: [
          {
            type: 'text',
            text: `📄 Channel Information:\n\n${JSON.stringify(result, null, 2)}`
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get channel info: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
}