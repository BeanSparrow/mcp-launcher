import { BaseResource, ResourceContext } from '../base-resource.js';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';

export class DevelopmentLawsResource extends BaseResource {
  readonly uri = 'file://beans-laws-of-ai-co-development';
  readonly name = 'Beans Laws of AI Co-Development';
  readonly description = 'Development principles and guidelines for AI-assisted coding sessions';
  readonly mimeType = 'text/markdown';
  readonly category = 'documentation';

  constructor(context: ResourceContext) {
    super(context);
  }

  async read(uri: URL): Promise<ReadResourceResult> {
    // Find the development laws document in the resources folder
    for (const allowedDir of this.context.allowedDirectories) {
      const lawsPath = path.join(allowedDir, 'mcp_launcher', 'resources', 'Beans-Laws-of-AI-Co-Development.md');
      
      if (fs.existsSync(lawsPath)) {
        try {
          const content = fs.readFileSync(lawsPath, 'utf-8');
          return {
            contents: [
              {
                uri: this.uri,
                mimeType: this.mimeType,
                text: content
              }
            ]
          };
        } catch (error) {
          throw new Error(`Failed to read development laws: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    throw new Error('Development laws document not found in any allowed directory');
  }
}