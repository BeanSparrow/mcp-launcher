import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolResponse } from '../../base-tool.js';
import fs from 'fs/promises';
import path from 'path';

interface PatchEdit {
  type: 'replace' | 'insert' | 'delete';
  line?: number;
  after_line?: number;
  start_line?: number;
  end_line?: number;
  old?: string;
  new?: string;
  content?: string;
}

interface UsageGuidance {
  recommendation: 'strongly_recommended' | 'recommended' | 'acceptable' | 'not_recommended';
  reason: string;
  alternative?: string;
  efficiencyNote?: string;
}

export class EditFilePatchTool extends BaseTool {
  readonly name = 'edit_file_patch';
  readonly description = 'Apply multiple targeted edits to a file in a single atomic operation\n\nUSAGE GUIDANCE:\n✅ BEST FOR: Multiple edits (3+), large files (>50KB), atomic operations\n⚠️  CONSIDER: read_file + write_file for 1-2 simple changes in small files\n❌ AVOID: Major rewrites (>50% content changed), exploratory editing';
  readonly category = 'filesystem';

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to edit',
          },
          edits: {
            type: 'array',
            description: 'Array of edit operations to apply',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['replace', 'insert', 'delete'],
                  description: 'Type of edit operation',
                },
                line: {
                  type: 'number',
                  description: 'Line number for replace/delete operations (1-based)',
                },
                after_line: {
                  type: 'number',
                  description: 'Insert content after this line number (for insert operations)',
                },
                start_line: {
                  type: 'number',
                  description: 'Start line for multi-line delete operations',
                },
                end_line: {
                  type: 'number',
                  description: 'End line for multi-line delete operations',
                },
                old: {
                  type: 'string',
                  description: 'Original content to replace (for validation)',
                },
                new: {
                  type: 'string',
                  description: 'New content for replace operations',
                },
                content: {
                  type: 'string',
                  description: 'Content to insert (for insert operations)',
                },
              },
              required: ['type'],
            },
          },
          validate_content: {
            type: 'boolean',
            description: 'Validate that old content matches before replacing (default: true)',
            default: true,
          },
          create_backup: {
            type: 'boolean',
            description: 'Create a backup file before editing (default: false)',
            default: false,
          },
          force_execution: {
            type: 'boolean',
            description: 'Override efficiency warnings and execute anyway (default: false)',
            default: false,
          },
          check_efficiency: {
            type: 'boolean',
            description: 'Check efficiency and provide guidance without executing (default: false)',
            default: false,
          },
        },
        required: ['path', 'edits'],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const filePath = args.path as string;
      const edits = args.edits as PatchEdit[];
      const validateContent = args.validate_content !== false; // Default true
      const createBackup = args.create_backup as boolean || false;
      const forceExecution = args.force_execution as boolean || false;
      const checkEfficiency = args.check_efficiency as boolean || false;

      const resolvedPath = path.resolve(filePath);
      
      if (!this.context.isPathAllowed(resolvedPath)) {
        throw new Error(`Access denied: ${filePath}`);
      }

      // Validate file exists and get file info
      let fileStats;
      try {
        fileStats = await fs.stat(resolvedPath);
      } catch {
        throw new Error(`File does not exist: ${filePath}`);
      }

      // Read the current file content for analysis
      const originalContent = await fs.readFile(resolvedPath, 'utf-8');
      const lines = originalContent.split('\n');

      // Analyze usage efficiency
      const guidance = this.analyzeUsageEfficiency(fileStats, lines, edits);

      // If just checking efficiency, return guidance without executing
      if (checkEfficiency) {
        return this.createResponse(this.formatGuidanceResponse(guidance, filePath, edits.length));
      }

      // Check if we should proceed based on efficiency
      if (!forceExecution && guidance.recommendation === 'not_recommended') {
        return this.createResponse(
          `❌ EFFICIENCY WARNING: ${guidance.reason}\n\n` +
          `${guidance.alternative || 'Consider using read_file + write_file instead.'}\n\n` +
          `To proceed anyway, use force_execution: true\n` +
          `To see detailed guidance, use check_efficiency: true`
        );
      }

      // Show guidance for marginal cases
      if (guidance.recommendation === 'acceptable' && !forceExecution) {
        return this.createResponse(
          `⚠️  EFFICIENCY NOTE: ${guidance.reason}\n\n` +
          `${guidance.alternative || 'You might consider read_file + write_file for better efficiency.'}\n\n` +
          `Proceeding with patch operation...\n\n` +
          `To force without this warning, use force_execution: true`
        );
      }

      // Create backup if requested
      if (createBackup) {
        const backupPath = `${resolvedPath}.backup.${Date.now()}`;
        await fs.copyFile(resolvedPath, backupPath);
      }

      // Validate and sort edits
      const validatedEdits = this.validateEdits(edits, lines.length);
      const sortedEdits = this.sortEdits(validatedEdits);

      // Apply edits
      const result = await this.applyEdits(lines, sortedEdits, validateContent);
      
      // Write the modified content back
      await fs.writeFile(resolvedPath, result.modifiedLines.join('\n'), 'utf-8');

      // Create success response with efficiency note
      let successMessage = `Successfully applied ${edits.length} edits to ${filePath}\n` +
                          `Changes made:\n${result.changesSummary.join('\n')}`;

      if (guidance.efficiencyNote) {
        successMessage += `\n\n📊 EFFICIENCY: ${guidance.efficiencyNote}`;
      }

      return this.createResponse(successMessage);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
      }
  }

  private analyzeUsageEfficiency(fileStats: any, lines: string[], edits: PatchEdit[]): UsageGuidance {
    const fileSizeKB = fileStats.size / 1024;
    const totalLines = lines.length;
    const editCount = edits.length;

    // Count edits that need line number lookups (those without specific line numbers)
    const editsNeedingSearch = edits.filter(edit => 
      (edit.type === 'replace' && edit.line && !edit.old) ||
      (edit.type === 'insert' && edit.after_line === undefined) ||
      (edit.type === 'delete' && !edit.line && !edit.start_line)
    ).length;

    // Analysis categories
    
    // 1. Single edit in small file - not recommended
    if (editCount === 1 && fileSizeKB < 10) {
      return {
        recommendation: 'not_recommended',
        reason: 'Single edit in small file (<10KB) - read_file + write_file is more efficient',
        alternative: 'Use: read_file → modify content → write_file (saves ~2-3 tool calls)',
        efficiencyNote: 'read_file + write_file would be ~50% more efficient for this case'
      };
    }

    // 2. Few edits in small file - acceptable but not optimal
    if (editCount <= 2 && fileSizeKB < 20) {
      return {
        recommendation: 'acceptable',
        reason: 'Few edits in small file - marginal efficiency benefit',
        alternative: 'read_file + write_file might be simpler for 1-2 changes',
        efficiencyNote: 'Modest efficiency gain, but atomic operation provides safety benefit'
      };
    }

    // 3. Many edits requiring search - not recommended
    if (editsNeedingSearch > editCount * 0.5) {
      return {
        recommendation: 'not_recommended',
        reason: 'Many edits require line number searches - will need multiple search_files calls',
        alternative: 'Use read_file to analyze content, then patch with known line numbers',
        efficiencyNote: 'Line number searches could make this less efficient than read_file + write_file'
      };
    }

    // 4. Large file with targeted edits - strongly recommended
    if (fileSizeKB > 100 && editCount >= 3) {
      return {
        recommendation: 'strongly_recommended',
        reason: 'Large file with multiple edits - significant efficiency gains',
        efficiencyNote: `~${Math.round((1 - (editCount * 10 + 100) / (fileSizeKB * 2 * 1024)) * 100)}% reduction in data transfer vs read_file + write_file`
      };
    }

    // 5. Multiple edits in medium+ file - recommended
    if (editCount >= 3 && fileSizeKB > 10) {
      return {
        recommendation: 'recommended',
        reason: 'Multiple edits with atomic operation benefits',
        efficiencyNote: 'Good efficiency gains plus atomic safety and change tracking'
      };
    }

    // 6. Large file with few edits - recommended
    if (fileSizeKB > 50) {
      return {
        recommendation: 'recommended',
        reason: 'Large file - patch reduces data transfer significantly',
        efficiencyNote: `Saves ~${Math.round((1 - 100 / (fileSizeKB * 2)) * 100)}% data transfer vs full file read+write`
      };
    }

    // 7. Default case - acceptable
    return {
      recommendation: 'acceptable',
      reason: 'Standard patch operation - provides atomic safety benefits',
      efficiencyNote: 'Atomic operation with validation provides safety benefits'
    };
  }

  private formatGuidanceResponse(guidance: UsageGuidance, filePath: string, editCount: number): string {
    const emoji = {
      'strongly_recommended': '✅',
      'recommended': '👍',
      'acceptable': '⚠️',
      'not_recommended': '❌'
    };

    let response = `${emoji[guidance.recommendation]} EFFICIENCY ANALYSIS for ${filePath}\n\n`;
    response += `Recommendation: ${guidance.recommendation.toUpperCase().replace('_', ' ')}\n`;
    response += `Reason: ${guidance.reason}\n\n`;

    if (guidance.alternative) {
      response += `💡 Alternative: ${guidance.alternative}\n\n`;
    }

    if (guidance.efficiencyNote) {
      response += `📊 Efficiency: ${guidance.efficiencyNote}\n\n`;
    }

    response += `📋 Your request: ${editCount} edits\n\n`;

    if (guidance.recommendation === 'strongly_recommended' || guidance.recommendation === 'recommended') {
      response += `✅ Proceed with edit_file_patch for optimal efficiency`;
    } else if (guidance.recommendation === 'acceptable') {
      response += `⚠️  edit_file_patch is acceptable but consider alternatives`;
    } else {
      response += `❌ Consider read_file + write_file for better efficiency`;
    }

    return response;
  }

  private validateEdits(edits: PatchEdit[], totalLines: number): PatchEdit[] {
    const validated: PatchEdit[] = [];

    for (const edit of edits) {
      // Validate edit structure
      switch (edit.type) {
        case 'replace':
          if (!edit.line || !edit.new) {
            throw new Error(`Replace edit missing required fields: line, new`);
          }
          if (edit.line < 1 || edit.line > totalLines) {
            throw new Error(`Replace edit line ${edit.line} out of range (1-${totalLines})`);
          }
          break;

        case 'insert':
          if (edit.after_line === undefined || !edit.content) {
            throw new Error(`Insert edit missing required fields: after_line, content`);
          }
          if (edit.after_line < 0 || edit.after_line > totalLines) {
            throw new Error(`Insert edit after_line ${edit.after_line} out of range (0-${totalLines})`);
          }
          break;

        case 'delete':
          if (edit.line) {
            // Single line delete
            if (edit.line < 1 || edit.line > totalLines) {
              throw new Error(`Delete edit line ${edit.line} out of range (1-${totalLines})`);
            }
          } else if (edit.start_line && edit.end_line) {
            // Multi-line delete
            if (edit.start_line < 1 || edit.end_line > totalLines || edit.start_line > edit.end_line) {
              throw new Error(`Delete edit range ${edit.start_line}-${edit.end_line} invalid`);
            }
          } else {
            throw new Error(`Delete edit missing line or start_line/end_line`);
          }
          break;

        default:
          throw new Error(`Unknown edit type: ${edit.type}`);
      }

      validated.push(edit);
    }

    return validated;
  }

  private sortEdits(edits: PatchEdit[]): PatchEdit[] {
    // Sort edits by line number (descending) so we don't mess up line numbers
    // when applying edits from top to bottom
    return edits.sort((a, b) => {
      const aLine = a.line || a.start_line || a.after_line || 0;
      const bLine = b.line || b.start_line || b.after_line || 0;
      return bLine - aLine; // Descending order
    });
  }

  private async applyEdits(
    lines: string[], 
    edits: PatchEdit[], 
    validateContent: boolean
  ): Promise<{ modifiedLines: string[]; changesSummary: string[] }> {
    const modifiedLines = [...lines];
    const changesSummary: string[] = [];

    for (const edit of edits) {
      switch (edit.type) {
        case 'replace': {
          const lineIndex = edit.line! - 1; // Convert to 0-based
          const currentContent = modifiedLines[lineIndex];

          // Validate old content if requested
          if (validateContent && edit.old) {
            if (!currentContent.includes(edit.old)) {
              throw new Error(
                `Replace validation failed at line ${edit.line}: ` +
                `Expected to find "${edit.old}" but line contains "${currentContent}"`
              );
            }
          }

          // Apply replacement
          if (edit.old && validateContent) {
            modifiedLines[lineIndex] = currentContent.replace(edit.old, edit.new!);
          } else {
            modifiedLines[lineIndex] = edit.new!;
          }

          changesSummary.push(`Line ${edit.line}: Replaced content`);
          break;
        }

        case 'insert': {
          const insertIndex = edit.after_line!; // Insert after this line (0-based for splice)
          modifiedLines.splice(insertIndex + 1, 0, edit.content!);
          changesSummary.push(`After line ${edit.after_line}: Inserted content`);
          break;
        }

        case 'delete': {
          if (edit.line) {
            // Single line delete
            const lineIndex = edit.line - 1; // Convert to 0-based
            modifiedLines.splice(lineIndex, 1);
            changesSummary.push(`Line ${edit.line}: Deleted`);
          } else if (edit.start_line && edit.end_line) {
            // Multi-line delete
            const startIndex = edit.start_line - 1; // Convert to 0-based
            const deleteCount = edit.end_line - edit.start_line + 1;
            modifiedLines.splice(startIndex, deleteCount);
            changesSummary.push(`Lines ${edit.start_line}-${edit.end_line}: Deleted`);
          }
          break;
        }
      }
    }

    return { modifiedLines, changesSummary };
  }
}