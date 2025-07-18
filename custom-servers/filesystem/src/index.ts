#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import path from 'path';
import { ToolRegistry, ToolContext } from './tools/index.js';
import { ResourceRegistry, ResourceContext } from './resources/index.js';
import { z } from 'zod';

class EnhancedFilesystemServer {
  private mcpServer: McpServer;
  private allowedDirectories: string[];
  private toolRegistry: ToolRegistry;
  private resourceRegistry: ResourceRegistry;

  constructor() {
    // Create McpServer with basic info
    this.mcpServer = new McpServer(
      {
        name: 'enhanced-filesystem',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: { listChanged: true },
          resources: { listChanged: true },
        }
      }
    );

    this.allowedDirectories = process.argv.slice(2);
    if (this.allowedDirectories.length === 0) {
      throw new Error('At least one allowed directory must be provided');
    }

    // Create shared context
    const context = {
      allowedDirectories: this.allowedDirectories,
      isPathAllowed: this.isPathAllowed.bind(this)
    };

    // Initialize registries
    this.toolRegistry = new ToolRegistry(context as ToolContext);
    this.resourceRegistry = new ResourceRegistry(context as ResourceContext);

    // Register tools and resources with MCP server
    this.registerToolsWithMcp();
    this.registerResourcesWithMcp();
  }

  private registerToolsWithMcp() {
    const tools = this.toolRegistry.getAllTools();
    
    for (const tool of tools) {
      const schema = tool.getInputSchema();
      
      if (schema && schema instanceof z.ZodObject) {
        // Register tool with Zod object schema
        this.mcpServer.tool(
          tool.name,
          tool.description,
          schema.shape,
          async (args: any) => {
            return await tool.execute(args);
          }
        );
      } else if (schema) {
        // Register tool with other Zod schema
        this.mcpServer.tool(
          tool.name,
          tool.description,
          { args: schema },
          async (args: any) => {
            return await tool.execute(args);
          }
        );
      } else {
        // Register tool without schema (no arguments)
        this.mcpServer.tool(
          tool.name,
          tool.description,
          async () => {
            return await tool.execute({});
          }
        );
      }
    }

    console.error(`Registered ${tools.length} tools across ${this.toolRegistry.getCategories().length} categories`);
  }

  private registerResourcesWithMcp() {
    const resources = this.resourceRegistry.getAllResources();
    
    for (const resource of resources) {
      this.mcpServer.resource(
        resource.name,
        resource.uri,
        {
          description: resource.description,
          mimeType: resource.mimeType
        },
        async (uri: URL) => {
          return await resource.read(uri);
        }
      );
    }

    console.error(`Registered ${resources.length} resources across ${this.resourceRegistry.getCategories().length} categories`);
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
    await this.mcpServer.connect(transport);
    
    // Log tool information
    const toolCategories = this.toolRegistry.getCategories();
    console.error('Enhanced Filesystem MCP server running on stdio');
    console.error(`Tool categories: ${toolCategories.join(', ')}`);
    
    // Log tools by category
    for (const category of toolCategories) {
      const tools = this.toolRegistry.getToolsByCategory(category);
      console.error(`${category}: ${tools.map(t => t.name).join(', ')}`);
    }

    // Log resource information
    const resourceCategories = this.resourceRegistry.getCategories();
    console.error(`Resource categories: ${resourceCategories.join(', ')}`);
    
    // Log resources by category
    for (const category of resourceCategories) {
      const resources = this.resourceRegistry.getResourcesByCategory(category);
      console.error(`${category}: ${resources.map(r => r.name).join(', ')}`);
    }
  }
}

const server = new EnhancedFilesystemServer();
server.run().catch(console.error);