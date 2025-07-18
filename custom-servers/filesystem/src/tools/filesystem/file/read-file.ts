import { BaseTool, ToolResponse } from '../../base-tool.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export class ReadFileTool extends BaseTool {
  readonly name = 'read_file';
  readonly description = 'Read the complete contents of a file';
  readonly category = 'filesystem';

  getInputSchema() {
    return z.object({
      path: z.string().describe('Path to the file to read'),
    });
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
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }
}