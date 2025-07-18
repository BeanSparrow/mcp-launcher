import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';

export interface ResourceContext {
  allowedDirectories: string[];
  isPathAllowed: (path: string) => boolean;
}

export abstract class BaseResource {
  abstract readonly uri: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly mimeType: string;
  abstract readonly category: string;

  protected context: ResourceContext;

  constructor(context: ResourceContext) {
    this.context = context;
  }

  abstract read(uri: URL): Promise<ReadResourceResult>;
}