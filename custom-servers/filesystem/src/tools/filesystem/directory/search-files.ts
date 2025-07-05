import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolResponse } from '../../base-tool.js';
import fs from 'fs/promises';
import path from 'path';

interface SearchResult {
  file: string;
  type: 'file' | 'directory';
  size?: number;
  matches?: Array<{
    line: number;
    content: string;
    context?: string;
  }>;
  modified?: Date;
}

export class SearchFilesTool extends BaseTool {
  readonly name = 'search_files';
  readonly description = 'Search for files by name pattern, content, or metadata with advanced filtering';
  readonly category = 'filesystem';

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: 'Directory to search in (default: first allowed directory)',
          },
          pattern: {
            type: 'string',
            description: 'File name pattern (supports wildcards: *.ts, test*, *config*)',
          },
          content: {
            type: 'string',
            description: 'Search for text content within files (supports regex)',
          },
          file_type: {
            type: 'string',
            description: 'Filter by file extension (e.g., "ts", "js", "json")',
          },
          include_hidden: {
            type: 'boolean',
            description: 'Include hidden files and directories (default: false)',
            default: false,
          },
          max_depth: {
            type: 'number',
            description: 'Maximum directory depth to search (default: 10)',
            default: 10,
          },
          case_sensitive: {
            type: 'boolean',
            description: 'Case sensitive search (default: false)',
            default: false,
          },
          show_context: {
            type: 'boolean',
            description: 'Show surrounding lines for content matches (default: true)',
            default: true,
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results to return (default: 100)',
            default: 100,
          },
        },
        required: [],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const directory = args.directory as string || this.context.allowedDirectories[0];
      const pattern = args.pattern as string;
      const content = args.content as string;
      const fileType = args.file_type as string;
      const includeHidden = args.include_hidden as boolean || false;
      const maxDepth = args.max_depth as number || 10;
      const caseSensitive = args.case_sensitive as boolean || false;
      const showContext = args.show_context as boolean || true;
      const maxResults = args.max_results as number || 100;

      const resolvedDirectory = path.resolve(directory);
      
      if (!this.context.isPathAllowed(resolvedDirectory)) {
        throw new Error(`Access denied: ${directory}`);
      }

      // Validate directory exists
      try {
        const stats = await fs.stat(resolvedDirectory);
        if (!stats.isDirectory()) {
          throw new Error(`Path is not a directory: ${directory}`);
        }
      } catch {
        throw new Error(`Directory does not exist: ${directory}`);
      }

      const results = await this.searchFiles({
        directory: resolvedDirectory,
        pattern,
        content,
        fileType,
        includeHidden,
        maxDepth,
        caseSensitive,
        showContext,
        maxResults,
      });

      return this.createResponse(this.formatResults(results, args));
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  private async searchFiles(options: {
    directory: string;
    pattern?: string;
    content?: string;
    fileType?: string;
    includeHidden: boolean;
    maxDepth: number;
    caseSensitive: boolean;
    showContext: boolean;
    maxResults: number;
  }): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const visited = new Set<string>();

    await this.searchRecursive(
      options.directory,
      options,
      results,
      visited,
      0
    );

    // Sort results by relevance (content matches first, then alphabetically)
    results.sort((a, b) => {
      if (a.matches && a.matches.length > 0 && (!b.matches || b.matches.length === 0)) return -1;
      if (b.matches && b.matches.length > 0 && (!a.matches || a.matches.length === 0)) return 1;
      if (a.matches && b.matches) {
        return b.matches.length - a.matches.length; // More matches first
      }
      return a.file.localeCompare(b.file);
    });

    return results.slice(0, options.maxResults);
  }

  private async searchRecursive(
    currentDir: string,
    options: any,
    results: SearchResult[],
    visited: Set<string>,
    depth: number
  ): Promise<void> {
    if (depth > options.maxDepth || results.length >= options.maxResults) {
      return;
    }

    const realPath = await fs.realpath(currentDir);
    if (visited.has(realPath)) {
      return; // Avoid infinite loops with symlinks
    }
    visited.add(realPath);

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= options.maxResults) break;

        const fullPath = path.join(currentDir, entry.name);
        
        // Check if path is allowed
        if (!this.context.isPathAllowed(fullPath)) {
          continue;
        }

        // Skip hidden files unless requested
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const relativePath = path.relative(options.directory, fullPath);

        if (entry.isDirectory()) {
          // Check if directory name matches pattern
          if (this.matchesPattern(entry.name, options.pattern, options.caseSensitive)) {
            const stats = await fs.stat(fullPath);
            results.push({
              file: relativePath,
              type: 'directory',
              modified: stats.mtime,
            });
          }

          // Recurse into directory
          await this.searchRecursive(fullPath, options, results, visited, depth + 1);
        } else if (entry.isFile()) {
          const shouldInclude = this.shouldIncludeFile(entry.name, options);
          
          if (shouldInclude) {
            const stats = await fs.stat(fullPath);
            const result: SearchResult = {
              file: relativePath,
              type: 'file',
              size: stats.size,
              modified: stats.mtime,
            };

            // Search file content if requested
            if (options.content) {
              const matches = await this.searchFileContent(
                fullPath,
                options.content,
                options.caseSensitive,
                options.showContext
              );
              if (matches.length > 0) {
                result.matches = matches;
                results.push(result);
              }
            } else {
              results.push(result);
            }
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  private shouldIncludeFile(fileName: string, options: any): boolean {
    // Check file type filter
    if (options.fileType) {
      const ext = path.extname(fileName).slice(1).toLowerCase();
      if (ext !== options.fileType.toLowerCase()) {
        return false;
      }
    }

    // Check pattern match
    if (options.pattern) {
      return this.matchesPattern(fileName, options.pattern, options.caseSensitive);
    }

    return true;
  }

  private matchesPattern(fileName: string, pattern: string | undefined, caseSensitive: boolean): boolean {
    if (!pattern) return true;

    const name = caseSensitive ? fileName : fileName.toLowerCase();
    const pat = caseSensitive ? pattern : pattern.toLowerCase();

    // Convert wildcard pattern to regex
    const regexPattern = pat
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .

    return new RegExp(`^${regexPattern}$`).test(name);
  }

  private async searchFileContent(
    filePath: string,
    searchText: string,
    caseSensitive: boolean,
    showContext: boolean
  ): Promise<Array<{ line: number; content: string; context?: string }>> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const matches: Array<{ line: number; content: string; context?: string }> = [];

      const searchRegex = new RegExp(
        searchText,
        caseSensitive ? 'g' : 'gi'
      );

      for (let i = 0; i < lines.length; i++) {
        if (searchRegex.test(lines[i])) {
          const match: any = {
            line: i + 1,
            content: lines[i].trim(),
          };

          if (showContext) {
            const contextLines = [];
            const start = Math.max(0, i - 1);
            const end = Math.min(lines.length - 1, i + 1);
            
            for (let j = start; j <= end; j++) {
              if (j !== i) {
                contextLines.push(`${j + 1}: ${lines[j].trim()}`);
              }
            }
            
            if (contextLines.length > 0) {
              match.context = contextLines.join('\n');
            }
          }

          matches.push(match);
          
          // Reset regex for next search
          searchRegex.lastIndex = 0;
        }
      }

      return matches;
    } catch (error) {
      // Skip files we can't read (binary files, permission issues, etc.)
      return [];
    }
  }

  private formatResults(results: SearchResult[], args: Record<string, any>): string {
    if (results.length === 0) {
      return 'No files found matching the search criteria.';
    }

    const output: string[] = [];
    const hasContentSearch = !!args.content;
    
    output.push(`Found ${results.length} ${results.length === args.max_results ? '(limited)' : ''} results:\n`);

    // Group results by type
    const files = results.filter(r => r.type === 'file');
    const directories = results.filter(r => r.type === 'directory');

    if (directories.length > 0) {
      output.push('📁 DIRECTORIES:');
      for (const dir of directories) {
        output.push(`  ${dir.file}/`);
      }
      output.push('');
    }

    if (files.length > 0) {
      output.push('📄 FILES:');
      for (const file of files) {
        const sizeStr = file.size ? ` (${this.formatFileSize(file.size)})` : '';
        const matchStr = file.matches ? ` [${file.matches.length} matches]` : '';
        
        output.push(`  ${file.file}${sizeStr}${matchStr}`);
        
        if (hasContentSearch && file.matches && file.matches.length > 0) {
          for (const match of file.matches.slice(0, 3)) { // Limit to first 3 matches per file
            output.push(`    Line ${match.line}: ${match.content}`);
            if (match.context && args.show_context) {
              output.push(`    Context:\n${match.context.split('\n').map(l => `      ${l}`).join('\n')}`);
            }
          }
          if (file.matches.length > 3) {
            output.push(`    ... and ${file.matches.length - 3} more matches`);
          }
          output.push('');
        }
      }
    }

    // Add summary
    output.push('---');
    output.push(`Summary: ${files.length} files, ${directories.length} directories`);
    if (hasContentSearch) {
      const totalMatches = files.reduce((sum, f) => sum + (f.matches?.length || 0), 0);
      output.push(`Total content matches: ${totalMatches}`);
    }

    return output.join('\n');
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