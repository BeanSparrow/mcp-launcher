import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z, ZodSchema } from 'zod';

export interface ToolContext {
  allowedDirectories: string[];
  isPathAllowed: (filePath: string) => boolean;
}

// Use the exact MCP CallToolResult type
export type ToolResponse = CallToolResult;

export abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: string;

  constructor(protected context: ToolContext) {}

  // Return Zod schema for input validation
  abstract getInputSchema(): ZodSchema | undefined;

  // Execute method with proper typing
  abstract execute(args: Record<string, any>): Promise<ToolResponse>;

  protected createResponse(text: string, isError: boolean = false): ToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: text,
        },
      ],
      isError,
    };
  }

  protected createErrorResponse(error: string | Error): ToolResponse {
    const errorMessage = error instanceof Error ? error.message : error;
    return this.createResponse(`Error: ${errorMessage}`, true);
  }
}