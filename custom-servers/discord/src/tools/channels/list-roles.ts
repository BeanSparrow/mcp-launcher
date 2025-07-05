import { Client, GatewayIntentBits } from 'discord.js';
import { BaseDiscordTool } from '../base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class ListRolesTool extends BaseDiscordTool {
  name = 'discord_list_roles';
  description = 'List all roles in the Discord server with their IDs and properties';
  category = 'channels';
  requiredPermissions: string[] = ['ViewChannel'];

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          guildId: {
            type: 'string',
            description: 'Guild ID to list roles from (optional, uses configured guild if not provided)'
          },
          includePermissions: {
            type: 'boolean',
            description: 'Include role permissions in the output (default: false)'
          },
          includeMentionable: {
            type: 'boolean',
            description: 'Include whether the role is mentionable (default: true)'
          }
        },
        required: []
      }
    };
  }

  async execute(args: {
    guildId?: string;
    includePermissions?: boolean;
    includeMentionable?: boolean;
  }): Promise<any> {
    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds
        ]
      });

      const targetGuildId = args.guildId || this.context.guildId;
      if (!targetGuildId) {
        throw new Error('No guild ID provided and no default guild configured');
      }

      const includePermissions = args.includePermissions || false;
      const includeMentionable = args.includeMentionable !== false;

      const rolesPromise = new Promise((resolve, reject) => {
        client.once('ready', async () => {
          try {
            const guild = client.guilds.cache.get(targetGuildId);
            if (!guild) {
              throw new Error(`Bot is not a member of guild: ${targetGuildId}`);
            }

            const roles = guild.roles.cache;
            
            const roleList = Array.from(roles.values()).map(role => {
              const baseInfo = {
                id: role.id,
                name: role.name,
                color: role.hexColor,
                position: role.position,
                memberCount: role.members.size,
                createdAt: role.createdAt.toISOString(),
                managed: role.managed, // Bot roles, Nitro booster, etc.
                hoist: role.hoist, // Displayed separately in member list
                mentionTag: `<@&${role.id}>` // The actual mention format
              };

              // Add mentionable info if requested
              if (includeMentionable) {
                (baseInfo as any).mentionable = role.mentionable;
              }

              // Add permissions if requested
              if (includePermissions) {
                (baseInfo as any).permissions = role.permissions.toArray();
              }

              return baseInfo;
            });

            // Sort by position (higher position = higher in hierarchy)
            roleList.sort((a, b) => b.position - a.position);

            // Separate special roles
            const everyoneRole = roleList.find(role => role.name === '@everyone');
            const botRoles = roleList.filter(role => role.managed);
            const regularRoles = roleList.filter(role => !role.managed && role.name !== '@everyone');

            const result = {
              guildId: targetGuildId,
              guildName: guild.name,
              totalRoles: roleList.length,
              roles: {
                all: roleList,
                everyone: everyoneRole,
                botManaged: botRoles,
                regular: regularRoles
              },
              mentionGuide: {
                format: 'Use <@&ROLE_ID> to mention a role',
                example: `To mention regulars: ${roleList.find(r => r.name.toLowerCase().includes('regular'))?.mentionTag || 'Role not found'}`,
                note: 'Copy the mentionTag value to use in messages'
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
          reject(new Error('Role listing timeout'));
        }, 10000);
      });

      await client.login(this.context.botToken);
      const result = await rolesPromise;

      return {
        content: [
          {
            type: 'text',
            text: `📋 Discord Roles:\n\n${JSON.stringify(result, null, 2)}`
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list roles: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
}