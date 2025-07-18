import { BaseResource, ResourceContext } from './base-resource.js';

// Import documentation resources
import {
  DevelopmentLawsResource
} from './documentation/index.js';

export class ResourceRegistry {
  private resources: Map<string, BaseResource> = new Map();
  private context: ResourceContext;

  constructor(context: ResourceContext) {
    this.context = context;
    this.registerResources();
  }

  private registerResources() {
    // Register documentation resources
    this.registerResource(new DevelopmentLawsResource(this.context));
  }

  private registerResource(resource: BaseResource) {
    this.resources.set(resource.uri, resource);
  }

  getAllResources(): BaseResource[] {
    return Array.from(this.resources.values());
  }

  getResourcesByCategory(category: string): BaseResource[] {
    return Array.from(this.resources.values()).filter(resource => resource.category === category);
  }

  getCategories(): string[] {
    const categories = new Set(Array.from(this.resources.values()).map(resource => resource.category));
    return Array.from(categories);
  }

  getResource(uri: string): BaseResource | undefined {
    return this.resources.get(uri);
  }

  hasResource(uri: string): boolean {
    return this.resources.has(uri);
  }
}