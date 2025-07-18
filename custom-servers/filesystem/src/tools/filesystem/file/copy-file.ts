import { BaseTool, ToolResponse } from '../../base-tool.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export class CopyFileTool extends BaseTool {
  readonly name = 'copy_file';
  readonly description = 'Copy a file from source to destination';
  readonly category = 'filesystem';

  getInputSchema() {
    return z.object({
      source: z.string().describe('Path to the source file'),
      destination: z.string().describe('Path to the destination file'),
      overwrite: z.boolean().default(false).describe('Whether to overwrite existing files (default: false)'),
    });
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const sourcePath = args.source as string;
      const destinationPath = args.destination as string;
      const overwrite = args.overwrite as boolean || false;

      const resolvedSource = path.resolve(sourcePath);
      const resolvedDestination = path.resolve(destinationPath);
      
      // Validate both paths are allowed
      if (!this.context.isPathAllowed(resolvedSource)) {
        throw new Error(`Access denied to source: ${sourcePath}`);
      }
      
      if (!this.context.isPathAllowed(resolvedDestination)) {
        throw new Error(`Access denied to destination: ${destinationPath}`);
      }

      // Check if source exists and is a file
      try {
        const sourceStats = await fs.stat(resolvedSource);
        if (!sourceStats.isFile()) {
          throw new Error(`Source is not a file: ${sourcePath}`);
        }
      } catch {
        throw new Error(`Source file does not exist: ${sourcePath}`);
      }

      // Check if destination already exists
      if (!overwrite) {
        try {
          await fs.access(resolvedDestination);
          throw new Error(`Destination already exists (use overwrite=true to replace): ${destinationPath}`);
        } catch (error) {
          // File doesn't exist, which is what we want
          if (error instanceof Error && !error.message.includes('Destination already exists')) {
            // It's fine if the file doesn't exist
          } else {
            throw error;
          }
        }
      }

      // Create destination directory if it doesn't exist
      await fs.mkdir(path.dirname(resolvedDestination), { recursive: true });

      // Copy the file
      await fs.copyFile(resolvedSource, resolvedDestination);

      // Get file size for confirmation
      const stats = await fs.stat(resolvedDestination);
      const size = this.formatFileSize(stats.size);

      return this.createResponse(`Successfully copied file from ${sourcePath} to ${destinationPath} (${size})`);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
  }
}