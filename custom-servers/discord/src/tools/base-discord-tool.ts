import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface DiscordToolContext {
  botToken: string;
  clientId?: string;
  guildId?: string;
  isAuthenticated: () => boolean;
  validatePermissions: (permission: string) => boolean;
}

export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export abstract class BaseDiscordTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: string;
  abstract readonly requiredPermissions: string[];

  constructor(protected context: DiscordToolContext) {}

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

  protected validateAuthentication(): void {
    if (!this.context.isAuthenticated()) {
      throw new Error('Discord bot not authenticated. Please check your bot token.');
    }
  }

  protected validatePermissions(): void {
    for (const permission of this.requiredPermissions) {
      if (!this.context.validatePermissions(permission)) {
        throw new Error(`Missing required Discord permission: ${permission}`);
      }
    }
  }
}