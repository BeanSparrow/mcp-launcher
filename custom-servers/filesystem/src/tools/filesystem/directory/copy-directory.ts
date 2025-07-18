import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolResponse } from '../../base-tool.js';
import fs from 'fs/promises';
import path from 'path';

export class CopyDirectoryTool extends BaseTool {
  readonly name = 'copy_directory';
  readonly description = 'Copy a directory and its contents from source to destination';
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
          recursive: {
            type: 'boolean',
            description: 'Copy directory contents recursively (default: true)',
            default: true,
          },
          overwrite: {
            type: 'boolean',
            description: 'Whether to overwrite existing files (default: false)',
            default: false,
          },
          include_patterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Only copy files matching these patterns (e.g., ["*.ts", "*.js"])',
          },
          exclude_patterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Skip files matching these patterns (e.g., ["*.test.ts", "node_modules/*"])',
          },
          preserve_timestamps: {
            type: 'boolean',
            description: 'Preserve original file timestamps (default: true)',
            default: true,
          },
          max_depth: {
            type: 'number',
            description: 'Maximum directory depth to copy (default: 50)',
            default: 50,
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
      const recursive = args.recursive !== false; // Default true
      const overwrite = args.overwrite as boolean || false;
      const includePatterns = args.include_patterns as string[] || [];
      const excludePatterns = args.exclude_patterns as string[] || [];
      const preserveTimestamps = args.preserve_timestamps !== false; // Default true
      const maxDepth = args.max_depth as number || 50;

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

      // Check if destination is inside source (prevent infinite recursion)
      if (resolvedDestination.startsWith(resolvedSource + path.sep)) {
        throw new Error(`Cannot copy directory into itself: ${destinationPath} is inside ${sourcePath}`);
      }

      // Check if destination already exists
      let destinationExists = false;
      try {
        const destStats = await fs.stat(resolvedDestination);
        destinationExists = true;
        if (!destStats.isDirectory()) {
          throw new Error(`Destination exists and is not a directory: ${destinationPath}`);
        }
      } catch {
        // Destination doesn't exist, we'll create it
      }

      const copyStats = {
        filescopied: 0,
        directoriesCreated: 0,
        filesSkipped: 0,
        totalSize: 0,
      };

      // Start the recursive copy
      await this.copyDirectoryRecursive(
        resolvedSource,
        resolvedDestination,
        {
          recursive,
          overwrite,
          includePatterns,
          excludePatterns,
          preserveTimestamps,
          maxDepth,
        },
        copyStats,
        0
      );

      const sizeStr = this.formatFileSize(copyStats.totalSize);
      return this.createResponse(
        `Successfully copied directory from ${sourcePath} to ${destinationPath}\n` +
        `Files copied: ${copyStats.filescopied}\n` +
        `Directories created: ${copyStats.directoriesCreated}\n` +
        `Files skipped: ${copyStats.filesSkipped}\n` +
        `Total size: ${sizeStr}`
      );
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
      }
  }

  private async copyDirectoryRecursive(
    sourceDir: string,
    destDir: string,
    options: any,
    stats: any,
    depth: number
  ): Promise<void> {
    if (depth > options.maxDepth) {
      return;
    }

    // Create destination directory if it doesn't exist
    try {
      await fs.mkdir(destDir, { recursive: true });
      stats.directoriesCreated++;
    } catch {
      // Directory might already exist
    }

    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      // Check if path is allowed
      if (!this.context.isPathAllowed(sourcePath) || !this.context.isPathAllowed(destPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        if (options.recursive) {
          await this.copyDirectoryRecursive(sourcePath, destPath, options, stats, depth + 1);
        }
      } else if (entry.isFile()) {
        // Check if file should be included/excluded
        if (!this.shouldIncludeFile(entry.name, options.includePatterns, options.excludePatterns)) {
          stats.filesSkipped++;
          continue;
        }

        // Check if destination file exists
        if (!options.overwrite) {
          try {
            await fs.access(destPath);
            stats.filesSkipped++;
            continue; // Skip existing files
          } catch {
            // File doesn't exist, proceed with copy
          }
        }

        // Copy the file
        await fs.copyFile(sourcePath, destPath);
        stats.filescopied++;

        // Get file size
        const fileStats = await fs.stat(destPath);
        stats.totalSize += fileStats.size;

        // Preserve timestamps if requested
        if (options.preserveTimestamps) {
          const sourceStats = await fs.stat(sourcePath);
          await fs.utimes(destPath, sourceStats.atime, sourceStats.mtime);
        }
      }
    }
  }

  private shouldIncludeFile(fileName: string, includePatterns: string[], excludePatterns: string[]): boolean {
    // If include patterns are specified, file must match at least one
    if (includePatterns.length > 0) {
      const matches = includePatterns.some(pattern => this.matchesPattern(fileName, pattern));
      if (!matches) {
        return false;
      }
    }

    // If exclude patterns are specified, file must not match any
    if (excludePatterns.length > 0) {
      const matches = excludePatterns.some(pattern => this.matchesPattern(fileName, pattern));
      if (matches) {
        return false;
      }
    }

    return true;
  }

  private matchesPattern(fileName: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .

    return new RegExp(`^${regexPattern}$`, 'i').test(fileName);
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