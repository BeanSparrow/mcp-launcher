import { BaseTool, ToolResponse } from '../../base-tool.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export class SearchFilesTool extends BaseTool {
  readonly name = 'search_files';
  readonly description = 'Search for files by name pattern, content, or metadata with advanced filtering';
  readonly category = 'filesystem';

  getInputSchema() {
    return z.object({
      directory: z.string().optional().describe('Directory to search in (default: first allowed directory)'),
      pattern: z.string().optional().describe('File name pattern (supports wildcards: *.ts, test*, *config*)'),
      content: z.string().optional().describe('Search for text content within files (supports regex)'),
      file_type: z.string().optional().describe('Filter by file extension (e.g., "ts", "js", "json")'),
      max_depth: z.number().default(10).describe('Maximum directory depth to search (default: 10)'),
      max_results: z.number().default(100).describe('Maximum number of results to return (default: 100)'),
      case_sensitive: z.boolean().default(false).describe('Case sensitive search (default: false)'),
      include_hidden: z.boolean().default(false).describe('Include hidden files and directories (default: false)'),
      show_context: z.boolean().default(true).describe('Show surrounding lines for content matches (default: true)'),
    });
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const searchDir = args.directory || this.context.allowedDirectories[0];
      const pattern = args.pattern as string;
      const content = args.content as string;
      const fileType = args.file_type as string;
      const maxDepth = args.max_depth as number || 10;
      const maxResults = args.max_results as number || 100;
      const caseSensitive = args.case_sensitive as boolean || false;
      const includeHidden = args.include_hidden as boolean || false;
      const showContext = args.show_context as boolean !== false;

      const resolvedDir = path.resolve(searchDir);
      
      if (!this.context.isPathAllowed(resolvedDir)) {
        throw new Error(`Access denied: ${searchDir}`);
      }

      const results = await this.searchFiles(
        resolvedDir,
        pattern,
        content,
        fileType,
        maxDepth,
        maxResults,
        caseSensitive,
        includeHidden,
        showContext
      );

      if (results.length === 0) {
        return this.createResponse('No files found matching the search criteria.');
      }

      const output = `Found ${results.length} result${results.length === 1 ? '' : 's'}:\n\n${results.join('\n\n')}`;
      return this.createResponse(output);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async searchFiles(
    directory: string,
    pattern?: string,
    content?: string,
    fileType?: string,
    maxDepth: number = 10,
    maxResults: number = 100,
    caseSensitive: boolean = false,
    includeHidden: boolean = false,
    showContext: boolean = true
  ): Promise<string[]> {
    const results: string[] = [];
    const visited = new Set<string>();

    await this.searchRecursive(
      directory,
      directory,
      pattern,
      content,
      fileType,
      maxDepth,
      maxResults,
      caseSensitive,
      includeHidden,
      showContext,
      results,
      visited,
      0
    );

    return results;
  }

  private async searchRecursive(
    baseDir: string,
    currentDir: string,
    pattern?: string,
    content?: string,
    fileType?: string,
    maxDepth: number = 10,
    maxResults: number = 100,
    caseSensitive: boolean = false,
    includeHidden: boolean = false,
    showContext: boolean = true,
    results: string[] = [],
    visited: Set<string> = new Set(),
    depth: number = 0
  ): Promise<void> {
    if (depth > maxDepth || results.length >= maxResults || visited.has(currentDir)) {
      return;
    }

    visited.add(currentDir);

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (entry.isFile()) {
          if (await this.matchesFileCriteria(entry.name, fullPath, pattern, content, fileType, caseSensitive)) {
            results.push(`📄 ${relativePath}`);
          }
        } else if (entry.isDirectory()) {
          await this.searchRecursive(
            baseDir,
            fullPath,
            pattern,
            content,
            fileType,
            maxDepth,
            maxResults,
            caseSensitive,
            includeHidden,
            showContext,
            results,
            visited,
            depth + 1
          );
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  private async matchesFileCriteria(
    fileName: string,
    filePath: string,
    pattern?: string,
    content?: string,
    fileType?: string,
    caseSensitive: boolean = false
  ): Promise<boolean> {
    // Check file type filter
    if (fileType) {
      const ext = path.extname(fileName).slice(1);
      if (ext !== fileType) {
        return false;
      }
    }

    // Check name pattern
    if (pattern) {
      const regex = this.createPatternRegex(pattern, caseSensitive);
      if (!regex.test(fileName)) {
        return false;
      }
    }

    // Check content
    if (content) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const contentRegex = new RegExp(content, caseSensitive ? 'g' : 'gi');
        if (!contentRegex.test(fileContent)) {
          return false;
        }
      } catch {
        // Skip files we can't read or binary files
        return false;
      }
    }

    return true;
  }

  private createPatternRegex(pattern: string, caseSensitive: boolean): RegExp {
    // Convert glob pattern to regex
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
    const flags = caseSensitive ? '' : 'i';
    return new RegExp(`^${regexPattern}$`, flags);
  }
}