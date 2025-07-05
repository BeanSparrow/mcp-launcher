import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolResponse } from '../../base-tool.js';
import fs from 'fs/promises';
import path from 'path';

export class MoveDirectoryTool extends BaseTool {
  readonly name = 'move_directory';
  readonly description = 'Move or rename a directory from source to destination';
  readonly category = 'filesystem';

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            description: 'Path to the source directory',
          },
          destination: {
            type: 'string',
            description: 'Path to the destination directory',
          },
          merge_existing: {
            type: 'boolean',
            description: 'If destination exists, merge contents instead of failing (default: false)',
            default: false,
          },
          overwrite_files: {
            type: 'boolean',
            description: 'When merging, overwrite existing files (default: false)',
            default: false,
          },
        },
        required: ['source', 'destination'],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const sourcePath = args.source as string;
      const destinationPath = args.destination as string;
      const mergeExisting = args.merge_existing as boolean || false;
      const overwriteFiles = args.overwrite_files as boolean || false;

      const resolvedSource = path.resolve(sourcePath);
      const resolvedDestination = path.resolve(destinationPath);
      
      // Validate both paths are allowed
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

      // Check if destination is inside source (prevent moving into itself)
      if (resolvedDestination.startsWith(resolvedSource + path.sep) || resolvedDestination === resolvedSource) {
        throw new Error(`Cannot move directory into itself: ${destinationPath} is inside or same as ${sourcePath}`);
      }

      // Check if destination already exists
      let destinationExists = false;
      try {
        const destStats = await fs.stat(resolvedDestination);
        destinationExists = true;
        if (!destStats.isDirectory()) {
          throw new Error(`Destination exists and is not a directory: ${destinationPath}`);
        }
        if (!mergeExisting) {
          throw new Error(`Destination directory already exists (use merge_existing=true to merge): ${destinationPath}`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Destination directory already exists')) {
          throw error;
        }
        // Destination doesn't exist, proceed with simple move
      }

      let moveStats: any;

      if (destinationExists && mergeExisting) {
        // Complex merge operation
        moveStats = await this.mergeDirectories(resolvedSource, resolvedDestination, overwriteFiles);
        
        // Remove the source directory after successful merge
        await fs.rm(resolvedSource, { recursive: true, force: true });
      } else {
        // Simple atomic move/rename
        await fs.mkdir(path.dirname(resolvedDestination), { recursive: true });
        await fs.rename(resolvedSource, resolvedDestination);
        
        moveStats = {
          filesMoved: 'all',
          directoriesMoved: 'all',
          filesSkipped: 0,
          operation: 'atomic_move'
        };
      }

      // Determine if this was a rename or move operation
      const sourceDir = path.dirname(resolvedSource);
      const destDir = path.dirname(resolvedDestination);
      const operation = sourceDir === destDir ? 'renamed' : 'moved';

      if (moveStats.operation === 'atomic_move') {
        return this.createResponse(`Successfully ${operation} directory from ${sourcePath} to ${destinationPath} (atomic operation)`);
      } else {
        return this.createResponse(
          `Successfully ${operation} directory from ${sourcePath} to ${destinationPath} (merge operation)\n` +
          `Files moved: ${moveStats.filesMoved}\n` +
          `Directories moved: ${moveStats.directoriesMoved}\n` +
          `Files skipped: ${moveStats.filesSkipped}`
        );
      }
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  private async mergeDirectories(sourceDir: string, destDir: string, overwriteFiles: boolean): Promise<any> {
    const stats = {
      filesMoved: 0,
      directoriesMoved: 0,
      filesSkipped: 0,
    };

    await this.mergeDirectoryRecursive(sourceDir, destDir, overwriteFiles, stats);
    return stats;
  }

  private async mergeDirectoryRecursive(sourceDir: string, destDir: string, overwriteFiles: boolean, stats: any): Promise<void> {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      // Check if paths are allowed
      if (!this.context.isPathAllowed(sourcePath) || !this.context.isPathAllowed(destPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        // Create destination directory if it doesn't exist
        try {
          await fs.mkdir(destPath, { recursive: true });
          stats.directoriesMoved++;
        } catch {
          // Directory might already exist
        }

        // Recursively merge contents
        await this.mergeDirectoryRecursive(sourcePath, destPath, overwriteFiles, stats);

        // Remove source directory if it's now empty
        try {
          await fs.rmdir(sourcePath);
        } catch {
          // Directory might not be empty, that's ok
        }
      } else if (entry.isFile()) {
        // Check if destination file exists
        let shouldMove = true;
        try {
          await fs.access(destPath);
          if (!overwriteFiles) {
            stats.filesSkipped++;
            shouldMove = false;
          }
        } catch {
          // File doesn't exist, proceed with move
        }

        if (shouldMove) {
          // Create destination directory if needed
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          
          // Move the file
          await fs.rename(sourcePath, destPath);
          stats.filesMoved++;
        }
      }
    }
  }
}