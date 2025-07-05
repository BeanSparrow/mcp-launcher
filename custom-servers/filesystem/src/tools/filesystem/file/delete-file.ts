import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolResponse } from '../../base-tool.js';
import fs from 'fs/promises';
import path from 'path';

export class DeleteFileTool extends BaseTool {
  readonly name = 'delete_file';
  readonly description = 'Delete a file or directory';
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
            description: 'Path to the file or directory to delete',
          },
          recursive: {
            type: 'boolean',
            description: 'If true, delete directories and their contents recursively (default: false)',
            default: false,
          },
        },
        required: ['path'],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const filePath = args.path as string;
      const recursive = args.recursive as boolean || false;
      const resolvedPath = path.resolve(filePath);
      
      if (!this.context.isPathAllowed(resolvedPath)) {
        throw new Error(`Access denied: ${filePath}`);
      }

      // Check if the path exists
      try {
        await fs.access(resolvedPath);
      } catch {
        throw new Error(`Path does not exist: ${filePath}`);
      }

      // Get file stats to determine if it's a file or directory
      const stats = await fs.stat(resolvedPath);
      
      if (stats.isDirectory()) {
        if (recursive) {
          await fs.rm(resolvedPath, { recursive: true, force: true });
          return this.createResponse(`Successfully deleted directory and all contents: ${filePath}`);
        } else {
          // Try to delete empty directory
          try {
            await fs.rmdir(resolvedPath);
            return this.createResponse(`Successfully deleted empty directory: ${filePath}`);
          } catch (error) {
            throw new Error(`Directory is not empty. Use recursive=true to delete directory and all contents: ${filePath}`);
          }
        }
      } else {
        // It's a file
        await fs.unlink(resolvedPath);
        return this.createResponse(`Successfully deleted file: ${filePath}`);
      }
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }
}