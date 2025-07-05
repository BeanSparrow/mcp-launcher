import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolResponse } from '../../base-tool.js';
import fs from 'fs/promises';
import path from 'path';

export class ReadFileTool extends BaseTool {
  readonly name = 'read_file';
  readonly description = 'Read the complete contents of a file';
  readonly category = 'filesystem';

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read',
          },
        },
        required: ['path'],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const filePath = args.path as string;
      const resolvedPath = path.resolve(filePath);
      
      if (!this.context.isPathAllowed(resolvedPath)) {
        throw new Error(`Access denied: ${filePath}`);
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      return this.createResponse(content);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}