import { BaseTool, ToolResponse } from '../../base-tool.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export class WriteFileTool extends BaseTool {
  readonly name = 'write_file';
  readonly description = 'Create a new file or overwrite an existing file';
  readonly category = 'filesystem';

  getInputSchema() {
    return z.object({
      path: z.string().describe('Path to the file to write'),
      content: z.string().describe('Content to write to the file'),
    });
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const filePath = args.path as string;
      const content = args.content as string;
      const resolvedPath = path.resolve(filePath);
      
      if (!this.context.isPathAllowed(resolvedPath)) {
        throw new Error(`Access denied: ${filePath}`);
      }

      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
      await fs.writeFile(resolvedPath, content, 'utf-8');
      
      return this.createResponse(`Successfully wrote to ${filePath}`);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }
}