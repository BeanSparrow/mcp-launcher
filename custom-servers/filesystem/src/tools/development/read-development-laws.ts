import { BaseTool, ToolResponse } from '../base-tool.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export class ReadDevelopmentLawsTool extends BaseTool {
  readonly name = 'read_development_laws';
  readonly description = 'Read the Beans Laws of AI Co-Development guidelines and principles';
  readonly category = 'development';

  getInputSchema() {
    // No input parameters needed - just reads the laws
    return undefined;
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      // Find the development laws document in the resources folder
      for (const allowedDir of this.context.allowedDirectories) {
        const lawsPath = path.join(allowedDir, 'mcp_launcher', 'resources', 'Beans-Laws-of-AI-Co-Development.md');
        
        try {
          // Check if file exists
          await fs.access(lawsPath);
          
          // Read the development laws content
          const content = await fs.readFile(lawsPath, 'utf-8');
          
          return this.createResponse(content);
        } catch (fileError) {
          // File doesn't exist in this directory, try next
          continue;
        }
      }
      
      // If we get here, file wasn't found in any allowed directory
      throw new Error('Development laws document not found in any allowed directory');
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }
}