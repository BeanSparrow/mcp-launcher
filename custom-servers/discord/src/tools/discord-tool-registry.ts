import { BaseDiscordTool, DiscordToolContext } from './base-discord-tool.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Import tool categories (currently empty, ready for tools to be added)
// import {} from './auth/index.js';
// import {} from './messaging/index.js';  
// import {} from './channels/index.js';
// import {} from './analytics/index.js';

export class DiscordToolRegistry {
  private tools: Map<string, BaseDiscordTool> = new Map();
  private context: DiscordToolContext;

  constructor(context: DiscordToolContext) {
    this.context = context;
    this.registerTools();
  }

  private registerTools() {
    // Tools will be registered here as they are created
    console.error('Discord tool registry initialized with 0 tools');
    
    // Example of how tools will be registered:
    // this.registerTool(new AuthenticateTool(this.context));
    // this.registerTool(new GetMessagesTool(this.context));
    // this.registerTool(new SendMessageTool(this.context));
    // this.registerTool(new ListChannelsTool(this.context));
    // this.registerTool(new UserActivityTool(this.context));
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