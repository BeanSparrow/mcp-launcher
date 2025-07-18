import { BaseTool, ToolContext } from './base-tool.js';

// Import filesystem tools
import {
  // File operations
  ReadFileTool,
  WriteFileTool,
  DeleteFileTool,
  CopyFileTool,
  MoveFileTool,
  // Directory operations
  CreateDirectoryTool,
  ListDirectoryTool,
  SearchFilesTool,
  CopyDirectoryTool,
  MoveDirectoryTool
} from './filesystem/index.js';

// Import data science tools
import {
  CreateDataProjectTool
} from './data-science/index.js';

// Import development tools
import {
  ReadDevelopmentLawsTool
} from './development/index.js';

export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();
  private context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
    this.registerTools();
  }

  private registerTools() {
    // Register file operation tools
    this.registerTool(new ReadFileTool(this.context));
    this.registerTool(new WriteFileTool(this.context));
    this.registerTool(new DeleteFileTool(this.context));
    this.registerTool(new CopyFileTool(this.context));
    this.registerTool(new MoveFileTool(this.context));

    // Register directory operation tools
    this.registerTool(new CreateDirectoryTool(this.context));
    this.registerTool(new ListDirectoryTool(this.context));
    this.registerTool(new SearchFilesTool(this.context));
    this.registerTool(new CopyDirectoryTool(this.context));
    this.registerTool(new MoveDirectoryTool(this.context));

    // Register data science tools
    this.registerTool(new CreateDataProjectTool(this.context));

    // Register development tools
    this.registerTool(new ReadDevelopmentLawsTool(this.context));
  }

  private registerTool(tool: BaseTool) {
    this.tools.set(tool.name, tool);
  }

  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: string): BaseTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  getCategories(): string[] {
    const categories = new Set(Array.from(this.tools.values()).map(tool => tool.category));
    return Array.from(categories);
  }

  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
}