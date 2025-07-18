import { BaseTool, ToolResponse } from '../base-tool.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export class CreateDataProjectTool extends BaseTool {
  readonly name = 'create_data_project';
  readonly description = 'Create a data science project structure';
  readonly category = 'data-science';

  getInputSchema() {
    return z.object({
      name: z.string().describe('Project name'),
      type: z.enum(['analysis', 'ml', 'dashboard']).describe('Type of project'),
    });
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      const name = args.name as string;
      const type = args.type as string;
      const projectPath = path.join(this.context.allowedDirectories[0], name);
      
      if (!this.context.isPathAllowed(projectPath)) {
        throw new Error(`Access denied: ${projectPath}`);
      }

      const directories = [
        'data/raw',
        'data/processed',
        'notebooks',
        'src',
        'tests',
        'reports'
      ];

      // Create directory structure
      for (const dir of directories) {
        await fs.mkdir(path.join(projectPath, dir), { recursive: true });
      }

      // Create README
      const readme = `# ${name}\n\nA ${type} data science project.\n\n## Structure\n- data/ - Data files\n- notebooks/ - Jupyter notebooks\n- src/ - Source code\n- tests/ - Unit tests\n- reports/ - Generated reports`;
      await fs.writeFile(path.join(projectPath, 'README.md'), readme);

      // Create .gitignore
      const gitignore = `__pycache__/\n*.pyc\n.env\ndata/raw/*\n!data/raw/.gitkeep\n.ipynb_checkpoints`;
      await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);

      // Create .gitkeep file
      await fs.writeFile(path.join(projectPath, 'data/raw/.gitkeep'), '');

      const output = `✅ Created ${type} project '${name}' at ${projectPath}\n\nDirectories created: ${directories.join(', ')}\nFiles created: README.md, .gitignore`;
      return this.createResponse(output);
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }
}