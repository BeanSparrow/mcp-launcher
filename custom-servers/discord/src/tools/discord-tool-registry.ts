import { BaseDiscordTool, DiscordToolContext } from './base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Import our tools
import { TestConnectionTool, GetBotInfoTool } from './auth/index.js';
import { ListChannelsTool, GetChannelInfoTool, ListRolesTool } from './channels/index.js';
import { ReadMessagesTool, SendMessageTool, SendReplyTool, SearchMessagesTool } from './messaging/index.js';

export class DiscordToolRegistry {
  private tools: Map<string, BaseDiscordTool> = new Map();
  private context: DiscordToolContext;

  constructor(context: DiscordToolContext) {
    this.context = context;
    this.registerTools();
  }

  private registerTools() {
    // Register Tier 1 foundation tools
    
    // Authentication tools
    this.registerTool(new TestConnectionTool(this.context));
    this.registerTool(new GetBotInfoTool(this.context));
    
    // Channel tools
    this.registerTool(new ListChannelsTool(this.context));
    this.registerTool(new GetChannelInfoTool(this.context));
    this.registerTool(new ListRolesTool(this.context));
    
    // Tier 2 messaging tools
    this.registerTool(new ReadMessagesTool(this.context));
    this.registerTool(new SendMessageTool(this.context));
    this.registerTool(new SendReplyTool(this.context));
    this.registerTool(new SearchMessagesTool(this.context));
    
    console.error(`Discord tool registry initialized with ${this.tools.size} tools`);
  }

  private registerTool(tool: BaseDiscordTool) {
    console.error(`Registering Discord tool: ${tool.name} (${tool.category})`);
    this.tools.set(tool.name, tool);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values()).map(tool => tool.getToolDefinition());
  }

  getToolsByCategory(category: string): BaseDiscordTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  getCategories(): string[] {
    const categories = new Set(Array.from(this.tools.values()).map(tool => tool.category));
    return Array.from(categories);
  }

  async executeTool(name: string, args: Record<string, any>) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown Discord tool: ${name}`);
    }
    return await tool.execute(args);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  getToolInfo(name: string): { name: string; description: string; category: string } | null {
    const tool = this.tools.get(name);
    if (!tool) return null;
    
    return {
      name: tool.name,
      description: tool.description,
      category: tool.category
    };
  }
}