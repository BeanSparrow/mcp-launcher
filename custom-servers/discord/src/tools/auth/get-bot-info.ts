import { Client, GatewayIntentBits } from 'discord.js';
import { BaseDiscordTool } from '../base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class GetBotInfoTool extends BaseDiscordTool {
  name = 'discord_get_bot_info';
  description = 'Get detailed information about the Discord bot including permissions and server access';
  category = 'auth';
  requiredPermissions: string[] = []; // No special permissions needed for bot info

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    };
  }

  async execute(): Promise<any> {
    try {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages
        ]
      });

      const botInfoPromise = new Promise((resolve, reject) => {
        client.once('ready', async () => {
          try {
            const user = client.user!;
            const guilds = client.guilds.cache;
            
            const guildInfo = Array.from(guilds.values()).map(guild => ({
              id: guild.id,
              name: guild.name,
              memberCount: guild.memberCount,
              owner: guild.ownerId,
              botJoinedAt: guild.joinedAt?.toISOString()
            }));

            // Get permissions for the target guild if specified
            let targetGuildPerms = null;
            if (this.context.guildId) {
              const targetGuild = guilds.get(this.context.guildId);
              if (targetGuild) {
                const botMember = await targetGuild.members.fetch(user.id);
                targetGuildPerms = {
                  guildId: this.context.guildId,
                  guildName: targetGuild.name,
                  permissions: botMember.permissions.toArray(),
                  roles: botMember.roles.cache.map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor
                  }))
                };
              }
            }

            const botInfo = {
              bot: {
                id: user.id,
                username: user.username,
                tag: user.tag,
                avatar: user.displayAvatarURL(),
                createdAt: user.createdAt.toISOString(),
                verified: user.flags?.has('VerifiedBot') || false
              },
              connectivity: {
                status: 'Online',
                ping: client.ws.ping,
                uptime: client.uptime
              },
              guilds: {
                total: guilds.size,
                list: guildInfo
              },
              targetGuild: targetGuildPerms,
              configuredGuildId: this.context.guildId
            };

            client.destroy();
            resolve(botInfo);
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
          reject(new Error('Bot info retrieval timeout'));
        }, 15000);
      });

      await client.login(this.context.botToken);
      const result = await botInfoPromise;

      return {
        content: [
          {
            type: 'text',
            text: `🤖 Discord Bot Information:\n\n${JSON.stringify(result, null, 2)}`
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get bot info: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
}