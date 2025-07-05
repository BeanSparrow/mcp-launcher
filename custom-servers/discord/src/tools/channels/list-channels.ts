import { Client, GatewayIntentBits, ChannelType, GuildBasedChannel } from 'discord.js';
import { BaseDiscordTool } from '../base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class ListChannelsTool extends BaseDiscordTool {
  name = 'discord_list_channels';
  description = 'List all channels in the configured Discord server';
  category = 'channels';
  requiredPermissions: string[] = ['ViewChannel']; // Need to view channels

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          guildId: {
            type: 'string',
            description: 'Guild ID to list channels from (optional, uses configured guild if not provided)'
          },
          includeCategories: {
            type: 'boolean',
            description: 'Include category channels in the list (default: true)'
          },
          channelType: {
            type: 'string',
            enum: ['text', 'voice', 'category', 'announcement', 'thread', 'all'],
            description: 'Filter by channel type (default: all)'
          }
        },
        required: []
      }
    };
  }

  async execute(args: { 
    guildId?: string; 
    includeCategories?: boolean; 
    channelType?: string;
  }): Promise<any> {
    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages
        ]
      });

      const targetGuildId = args.guildId || this.context.guildId;
      if (!targetGuildId) {
        throw new Error('No guild ID provided and no default guild configured');
      }

      const channelsPromise = new Promise((resolve, reject) => {
        client.once('ready', async () => {
          try {
            const guild = client.guilds.cache.get(targetGuildId);
            if (!guild) {
              throw new Error(`Bot is not a member of guild: ${targetGuildId}`);
            }

            const channels = guild.channels.cache;
            const includeCategories = args.includeCategories !== false;
            const filterType = args.channelType || 'all';

            let filteredChannels = Array.from(channels.values());

            // Filter by type if specified
            if (filterType !== 'all') {
              const typeMap: { [key: string]: ChannelType[] } = {
                'text': [ChannelType.GuildText],
                'voice': [ChannelType.GuildVoice],
                'category': [ChannelType.GuildCategory],
                'announcement': [ChannelType.GuildAnnouncement],
                'thread': [ChannelType.PublicThread, ChannelType.PrivateThread]
              };

              const targetTypes = typeMap[filterType];
              if (targetTypes) {
                filteredChannels = filteredChannels.filter(channel => 
                  targetTypes.includes(channel.type)
                );
              }
            }

            // Filter out categories if requested
            if (!includeCategories) {
              filteredChannels = filteredChannels.filter(channel => 
                channel.type !== ChannelType.GuildCategory
              );
            }

            const channelList = filteredChannels.map(channel => {
              const baseInfo = {
                id: channel.id,
                name: channel.name,
                type: ChannelType[channel.type],
                position: 'position' in channel ? channel.position : 0,
                createdAt: channel.createdAt?.toISOString()
              };

              // Add additional info based on channel type
              if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
                return {
                  ...baseInfo,
                  topic: (channel as any).topic || null,
                  nsfw: (channel as any).nsfw || false,
                  parentId: channel.parentId
                };
              } else if (channel.type === ChannelType.GuildVoice) {
                return {
                  ...baseInfo,
                  bitrate: (channel as any).bitrate,
                  userLimit: (channel as any).userLimit,
                  parentId: channel.parentId
                };
              } else if (channel.type === ChannelType.GuildCategory) {
                return {
                  ...baseInfo,
                  childChannels: channels.filter(c => c.parentId === channel.id).size
                };
              }

              return baseInfo;
            });

            // Sort by position
            channelList.sort((a, b) => a.position - b.position);

            const result = {
              guildId: targetGuildId,
              guildName: guild.name,
              totalChannels: channelList.length,
              filters: {
                includeCategories,
                channelType: filterType
              },
              channels: channelList
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
          reject(new Error('Channel listing timeout'));
        }, 10000);
      });

      await client.login(this.context.botToken);
      const result = await channelsPromise;

      return {
        content: [
          {
            type: 'text',
            text: `📋 Discord Channels:\n\n${JSON.stringify(result, null, 2)}`
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list channels: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
}