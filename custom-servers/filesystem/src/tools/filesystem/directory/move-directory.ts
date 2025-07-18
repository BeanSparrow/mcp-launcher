import { BaseTool, ToolResponse } from '../../base-tool.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export class MoveDirectoryTool extends BaseTool {
  readonly name = 'move_directory';
  readonly description = 'Move or rename a directory from source to destination';
  readonly category = 'filesystem';

  getInputSchema() {
    return z.object({
      source: z.string().describe('Path to the source directory'),
      destination: z.string().describe('Path to the destination directory'),
      merge_existing: z.boolean().default(false).describe('If destination exists, merge contents instead of failing (default: false)'),
      overwrite_files: z.boolean().default(false).describe('When merging, overwrite existing files (default: false)'),
    });
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const sourcePath = args.source as string;
      const destinationPath = args.destination as string;
      const mergeExisting = args.merge_existing as boolean || false;
      const overwriteFiles = args.overwrite_files as boolean || false;

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

      // Check if destination exists
      try {
        const destStats = await fs.stat(resolvedDestination);
        if (destStats.isDirectory()) {
          if (!mergeExisting) {
            throw new Error(`Destination directory already exists (use merge_existing=true to merge): ${destinationPath}`);
          }
          // Merge directories
          await this.mergeDirectories(resolvedSource, resolvedDestination, overwriteFiles);
          // Remove source directory after successful merge
          await fs.rm(resolvedSource, { recursive: true });
          return this.createResponse(`Successfully moved and merged directory from ${sourcePath} to ${destinationPath}`);
        } else {
          throw new Error(`Destination exists but is not a directory: ${destinationPath}`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('ENOENT')) {
          // Destination doesn't exist, simple move
          await fs.rename(resolvedSource, resolvedDestination);
          return this.createResponse(`Successfully moved directory from ${sourcePath} to ${destinationPath}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async mergeDirectories(source: string, destination: string, overwriteFiles: boolean): Promise<void> {
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      
      if (entry.isDirectory()) {
        try {
          await fs.mkdir(destPath, { recursive: true });
          await this.mergeDirectories(srcPath, destPath, overwriteFiles);
        } catch (error) {
          // Directory might already exist, try to merge
          await this.mergeDirectories(srcPath, destPath, overwriteFiles);
        }
      } else if (entry.isFile()) {
        if (!overwriteFiles) {
          try {
            await fs.access(destPath);
            continue; // Skip existing files
          } catch {
            // File doesn't exist, proceed with move
          }
        }
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}