import { BaseTool, ToolResponse } from '../../base-tool.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export class CopyDirectoryTool extends BaseTool {
  readonly name = 'copy_directory';
  readonly description = 'Copy a directory and its contents from source to destination';
  readonly category = 'filesystem';

  getInputSchema() {
    return z.object({
      source: z.string().describe('Path to the source directory'),
      destination: z.string().describe('Path to the destination directory'),
      overwrite: z.boolean().default(false).describe('Whether to overwrite existing files (default: false)'),
      recursive: z.boolean().default(true).describe('Copy directory contents recursively (default: true)'),
    });
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const sourcePath = args.source as string;
      const destinationPath = args.destination as string;
      const overwrite = args.overwrite as boolean || false;
      const recursive = args.recursive !== false;

      const resolvedSource = path.resolve(sourcePath);
      const resolvedDestination = path.resolve(destinationPath);
      
      if (!this.context.isPathAllowed(resolvedSource)) {
        throw new Error(`Access denied to source: ${sourcePath}`);
      }
      
      if (!this.context.isPathAllowed(resolvedDestination)) {
        throw new Error(`Access denied to destination: ${destinationPath}`);
      }

      // Check if source exists and is a directory
      try {
        const sourceStats = await fs.stat(resolvedSource);
        if (!sourceStats.isDirectory()) {
          throw new Error(`Source is not a directory: ${sourcePath}`);
        }
      } catch {
        throw new Error(`Source directory does not exist: ${sourcePath}`);
      }

      await this.copyDirectory(resolvedSource, resolvedDestination, overwrite, recursive);
      
      return this.createResponse(`Successfully copied directory from ${sourcePath} to ${destinationPath}`);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async copyDirectory(source: string, destination: string, overwrite: boolean, recursive: boolean): Promise<void> {
    await fs.mkdir(destination, { recursive: true });
    
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      
      if (entry.isDirectory() && recursive) {
        await this.copyDirectory(srcPath, destPath, overwrite, recursive);
      } else if (entry.isFile()) {
        if (!overwrite) {
          try {
            await fs.access(destPath);
            continue; // Skip existing files
          } catch {
            // File doesn't exist, proceed with copy
          }
        }
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}