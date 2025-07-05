import { Client, GatewayIntentBits } from 'discord.js';
import { BaseDiscordTool } from '../base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class TestConnectionTool extends BaseDiscordTool {
  name = 'discord_test_connection';
  description = 'Test the Discord bot connection and verify basic functionality';
  category = 'auth';
  requiredPermissions: string[] = []; // No special permissions needed for connection test

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
      // Create a minimal Discord client for testing
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages
        ]
      });

      // Test connection with timeout
      const connectionPromise = new Promise((resolve, reject) => {
        client.once('ready', () => {
          const botInfo = {
            botId: client.user?.id,
            botUsername: client.user?.username,
            botTag: client.user?.tag,
            guilds: client.guilds.cache.size,
            status: 'Connected successfully'
          };
          client.destroy();
          resolve(botInfo);
        });

        client.once('error', (error) => {
          client.destroy();
          reject(error);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          client.destroy();
          reject(new Error('Connection timeout - check bot token and internet connection'));
        }, 10000);
      });

      await client.login(this.context.botToken);
      const result = await connectionPromise;

      return {
        content: [
          {
            type: 'text',
            text: `✅ Discord Bot Connection Successful!\n\n${JSON.stringify(result, null, 2)}`
          }
        ]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `❌ Discord Bot Connection Failed: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }
}