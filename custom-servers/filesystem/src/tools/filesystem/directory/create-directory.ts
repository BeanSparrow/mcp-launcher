import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolResponse } from '../../base-tool.js';
import fs from 'fs/promises';
import path from 'path';

export class CreateDirectoryTool extends BaseTool {
  readonly name = 'create_directory';
  readonly description = 'Create a new directory';
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
            description: 'Path to the directory to create',
          },
        },
        required: ['path'],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const dirPath = args.path as string;
      const resolvedPath = path.resolve(dirPath);
      
      if (!this.context.isPathAllowed(resolvedPath)) {
        throw new Error(`Access denied: ${dirPath}`);
      }

      await fs.mkdir(resolvedPath, { recursive: true });
      
      return this.createResponse(`Successfully created directory: ${dirPath}`);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
      }
  }
}