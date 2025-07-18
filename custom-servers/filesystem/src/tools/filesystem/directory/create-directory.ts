import { BaseTool, ToolResponse } from '../../base-tool.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export class CreateDirectoryTool extends BaseTool {
  readonly name = 'create_directory';
  readonly description = 'Create a new directory';
  readonly category = 'filesystem';

  getInputSchema() {
    return z.object({
      path: z.string().describe('Path to the directory to create'),
    });
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