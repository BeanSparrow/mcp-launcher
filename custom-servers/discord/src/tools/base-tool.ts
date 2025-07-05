import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolContext {
  allowedDirectories: string[];
  isPathAllowed: (filePath: string) => boolean;
}

export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: string;

  constructor(protected context: ToolContext) {}

  abstract getToolDefinition(): Tool;
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