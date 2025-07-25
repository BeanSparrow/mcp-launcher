import { BaseTool, ToolResponse } from '../../base-tool.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export class ListDirectoryTool extends BaseTool {
  readonly name = 'list_directory';
  readonly description = 'List files and directories';
  readonly category = 'filesystem';

  getInputSchema() {
    return z.object({
      path: z.string().describe('Path to the directory to list'),
    });
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const dirPath = args.path as string;
      const resolvedPath = path.resolve(dirPath);
      
      if (!this.context.isPathAllowed(resolvedPath)) {
        throw new Error(`Access denied: ${dirPath}`);
      }

      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const result = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
      }));
      
      const output = `Directory listing for ${dirPath}:\n` + 
                    result.map(item => `[${item.type.toUpperCase()}] ${item.name}`).join('\n');
      
      return this.createResponse(output);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }
}