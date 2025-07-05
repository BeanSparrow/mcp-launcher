#!/usr/bin/env node

// Load environment variables from .env file
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the project root (two levels up from the dist directory)
dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DiscordToolRegistry, DiscordToolContext } from './tools/index.js';

class DiscordMCPServer {
  private server: Server;
  private botToken: string;
  private toolRegistry: DiscordToolRegistry;

  constructor() {
    this.server = new Server(
      {
        name: 'discord-integration',
        version: '1.0.0',
      }
    );

    // Get bot token from environment
    this.botToken = process.env.DISCORD_BOT_TOKEN || '';
    if (!this.botToken) {
      throw new Error('DISCORD_BOT_TOKEN environment variable is required');
    }

    // Create Discord tool context
    const toolContext: DiscordToolContext = {
      botToken: this.botToken,
      clientId: process.env.DISCORD_CLIENT_ID,
      guildId: process.env.DISCORD_GUILD_ID,
      isAuthenticated: this.isAuthenticated.bind(this),
      validatePermissions: this.validatePermissions.bind(this)
    };

    // Initialize tool registry
    this.toolRegistry = new DiscordToolRegistry(toolContext);

    this.setupRequestHandlers();
  }

  private setupRequestHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolRegistry.getAllTools();
      console.error(`Registered ${tools.length} Discord tools across ${this.toolRegistry.getCategories().length} categories`);
      return { tools };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (!args) {
          throw new Error('No arguments provided');
        }

        if (!this.toolRegistry.hasTool(name)) {
          throw new Error(`Unknown Discord tool: ${name}`);
        }

        return await this.toolRegistry.executeTool(name, args);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private isAuthenticated(): boolean {
    // Basic check - in real implementation, this would verify the bot token
    return this.botToken.length > 0;
  }

  private validatePermissions(permission: string): boolean {
    // Placeholder for permission validation
    // In real implementation, this would check Discord bot permissions
    console.error(`Permission check requested for: ${permission}`);
    return true; // For now, assume all permissions are available
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log server information
    const categories = this.toolRegistry.getCategories();
    console.error('Discord MCP server running on stdio');
    console.error(`Bot token configured: ${this.botToken ? 'Yes' : 'No'}`);
    console.error(`Tool categories: ${categories.length > 0 ? categories.join(', ') : 'None (ready for tools)'}`);
    
    // Log tools by category
    for (const category of categories) {
      const tools = this.toolRegistry.getToolsByCategory(category);
      console.error(`${category}: ${tools.map(t => t.name).join(', ')}`);
    }
    
    if (categories.length === 0) {
      console.error('Discord server initialized with no tools - ready for tool development');
    }
  }
}

const server = new DiscordMCPServer();
server.run().catch(console.error);