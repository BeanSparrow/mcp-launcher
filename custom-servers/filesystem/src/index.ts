#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { ToolRegistry, ToolContext } from './tools/index.js';

class EnhancedFilesystemServer {
  private server: Server;
  private allowedDirectories: string[];
  private toolRegistry: ToolRegistry;

  constructor() {
    this.server = new Server(
      {
        name: 'enhanced-filesystem',
        version: '1.0.0',
      }
    );

    this.allowedDirectories = process.argv.slice(2);
    if (this.allowedDirectories.length === 0) {
      throw new Error('At least one allowed directory must be provided');
    }

    // Create tool context
    const toolContext: ToolContext = {
      allowedDirectories: this.allowedDirectories,
      isPathAllowed: this.isPathAllowed.bind(this)
    };

    // Initialize tool registry
    this.toolRegistry = new ToolRegistry(toolContext);

    this.setupRequestHandlers();
  }

  private setupRequestHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolRegistry.getAllTools();
      console.error(`Registered ${tools.length} tools across ${this.toolRegistry.getCategories().length} categories`);
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
          throw new Error(`Unknown tool: ${name}`);
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

  private isPathAllowed(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    return this.allowedDirectories.some((allowedDir) => {
      const resolvedAllowedDir = path.resolve(allowedDir);
      return resolvedPath.startsWith(resolvedAllowedDir);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log tool information
    const categories = this.toolRegistry.getCategories();
    console.error('Enhanced Filesystem MCP server running on stdio');
    console.error(`Tool categories: ${categories.join(', ')}`);
    
    // Log tools by category
    for (const category of categories) {
      const tools = this.toolRegistry.getToolsByCategory(category);
      console.error(`${category}: ${tools.map(t => t.name).join(', ')}`);
    }
  }
}

const server = new EnhancedFilesystemServer();
server.run().catch(console.error);