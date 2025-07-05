# Enhanced Filesystem MCP Server

A modular, extensible MCP (Model Context Protocol) server that provides efficient filesystem operations and development tools for Claude AI interactions.

## 🏗️ Architecture

This server uses a **modular tool architecture** where each tool is implemented as a separate class, organized by category and subcategory, and registered through a central registry system. This design makes it easy to add, modify, or remove tools without affecting the core server functionality.

### **Key Design Principles:**
- **Efficiency First**: Tools are designed to minimize conversation/plan usage through single-operation efficiency
- **CLI-Style Familiarity**: Operations mirror familiar command-line tools (mv, cp, etc.)
- **Atomic Operations**: Each tool call is a complete, safe filesystem operation
- **Modular Organization**: Tools are logically grouped for easy maintenance and extension

## 🛠️ Available Tools (11 Total)

### 📁 File Operations (5 Tools)

#### `read_file`
**Description**: Read the complete contents of a file  
**Parameters**:
- `path` (string, required): Path to the file to read

**Example**: `read_file({ path: "src/index.ts" })`

---

#### `write_file`
**Description**: Create a new file or overwrite an existing file  
**Parameters**:
- `path` (string, required): Path to the file to write
- `content` (string, required): Content to write to the file

**Example**: `write_file({ path: "config.json", content: "{\"debug\": true}" })`

---

#### `delete_file`
**Description**: Delete a file or directory  
**Parameters**:
- `path` (string, required): Path to the file or directory to delete
- `recursive` (boolean, optional): If true, delete directories and their contents recursively (default: false)

**Examples**: 
- `delete_file({ path: "temp.txt" })`
- `delete_file({ path: "old_folder", recursive: true })`

---

#### `copy_file` 🆕
**Description**: Copy a file from source to destination (efficient single operation)  
**Parameters**:
- `source` (string, required): Path to the source file
- `destination` (string, required): Path to the destination file
- `overwrite` (boolean, optional): Whether to overwrite existing files (default: false)

**Examples**: 
- `copy_file({ source: "index.ts", destination: "index.backup.ts" })`
- `copy_file({ source: "data.json", destination: "backup/data.json", overwrite: true })`

**Efficiency**: Replaces read_file + write_file (50% reduction in tool calls)

---

#### `move_file` 🆕
**Description**: Move or rename a file from source to destination (CLI-style mv command)  
**Parameters**:
- `source` (string, required): Path to the source file
- `destination` (string, required): Path to the destination file
- `overwrite` (boolean, optional): Whether to overwrite existing files (default: false)

**Examples**: 
- `move_file({ source: "index.ts", destination: "index.backup.ts" })` # Rename
- `move_file({ source: "index.ts", destination: "src/index.ts" })` # Move
- `move_file({ source: "index.ts", destination: "src/components/main.ts" })` # Move + Rename

**Efficiency**: Replaces read_file + write_file + delete_file (67% reduction in tool calls)

### 📂 Directory Operations (5 Tools)

#### `create_directory`
**Description**: Create a new directory (creates parent directories if needed)  
**Parameters**:
- `path` (string, required): Path to the directory to create

**Example**: `create_directory({ path: "src/utils/helpers" })`

---

#### `list_directory`
**Description**: List files and directories in a given path  
**Parameters**:
- `path` (string, required): Path to the directory to list

**Example**: `list_directory({ path: "src" })`

---

#### `search_files`
**Description**: Search for files by name pattern, content, or metadata with advanced filtering  
**Parameters**:
- `directory` (string, optional): Directory to search in (default: first allowed directory)
- `pattern` (string, optional): File name pattern (supports wildcards: *.ts, test*, *config*)
- `content` (string, optional): Search for text content within files (supports regex)
- `file_type` (string, optional): Filter by file extension (e.g., "ts", "js", "json")
- `include_hidden` (boolean, optional): Include hidden files and directories (default: false)
- `max_depth` (number, optional): Maximum directory depth to search (default: 10)
- `case_sensitive` (boolean, optional): Case sensitive search (default: false)
- `show_context` (boolean, optional): Show surrounding lines for content matches (default: true)
- `max_results` (number, optional): Maximum number of results to return (default: 100)

**Examples**:
- `search_files({ pattern: "*.ts" })` - Find all TypeScript files
- `search_files({ content: "TODO" })` - Find files containing "TODO"
- `search_files({ pattern: "*test*", content: "describe" })` - Find test files with specific content
- `search_files({ file_type: "json", directory: "config" })` - Find JSON files in config directory

**Efficiency**: Replaces 10-20+ individual list_directory + read_file calls (90%+ reduction)

---

#### `copy_directory` 🆕
**Description**: Copy a directory and its contents from source to destination  
**Parameters**:
- `source` (string, required): Path to the source directory
- `destination` (string, required): Path to the destination directory
- `recursive` (boolean, optional): Copy directory contents recursively (default: true)
- `overwrite` (boolean, optional): Whether to overwrite existing files (default: false)
- `include_patterns` (array, optional): Only copy files matching these patterns (e.g., ["*.ts", "*.js"])
- `exclude_patterns` (array, optional): Skip files matching these patterns (e.g., ["*.test.ts", "node_modules/*"])
- `preserve_timestamps` (boolean, optional): Preserve original file timestamps (default: true)
- `max_depth` (number, optional): Maximum directory depth to copy (default: 50)

**Examples**:
- `copy_directory({ source: "src", destination: "backup/src" })`
- `copy_directory({ source: "project", destination: "backup", exclude_patterns: ["node_modules/*", "*.log"] })`
- `copy_directory({ source: "templates/basic", destination: "new-project", include_patterns: ["*.ts", "*.json"] })`

**Efficiency**: Replaces 20-50+ individual operations (95%+ reduction in tool calls)

---

#### `move_directory` 🆕
**Description**: Move or rename a directory from source to destination  
**Parameters**:
- `source` (string, required): Path to the source directory
- `destination` (string, required): Path to the destination directory
- `merge_existing` (boolean, optional): If destination exists, merge contents instead of failing (default: false)
- `overwrite_files` (boolean, optional): When merging, overwrite existing files (default: false)

**Examples**:
- `move_directory({ source: "old-name", destination: "new-name" })` # Rename
- `move_directory({ source: "src/components", destination: "components" })` # Move
- `move_directory({ source: "temp", destination: "archive", merge_existing: true })` # Move + Merge

**Efficiency**: Replaces 25-100+ individual operations (97%+ reduction in tool calls)

### 🔬 Data Science Tools (1 Tool)

#### `create_data_project`
**Description**: Create a complete data science project structure with directories and template files  
**Parameters**:
- `name` (string, required): Project name
- `type` (string, required): Type of project - one of: "analysis", "ml", "dashboard"

**Example**: `create_data_project({ name: "sales_analysis", type: "ml" })`

**Creates**:
- Directory structure: `data/raw`, `data/processed`, `notebooks`, `src`, `tests`, `reports`
- Template `README.md` with project description
- `.gitignore` for Python/data science projects
- `.gitkeep` files to preserve empty directories

## 🚀 Efficiency & Performance Benefits

### **Conversation Efficiency Gains:**

| Operation | Old Method | New Method | Improvement |
|-----------|------------|------------|-------------|
| Copy file | 2 tool calls | 1 tool call | **50% reduction** |
| Rename file | 3 tool calls | 1 tool call | **67% reduction** |
| Copy directory (10 files) | 25+ tool calls | 1 tool call | **95% reduction** |
| Move directory | 30+ tool calls | 1 tool call | **97% reduction** |
| Find & process files | 10-20 tool calls | 1-2 tool calls | **85% reduction** |

### **Technical Advantages:**

1. **Atomic Operations**: Each tool call is a complete filesystem operation
2. **Binary Safe**: Works with any file type, not just text files  
3. **Memory Efficient**: No intermediate content loading for copy/move operations
4. **OS-Level Performance**: Uses native filesystem APIs for maximum speed
5. **Metadata Preservation**: Maintains timestamps, permissions when copying
6. **Pattern Filtering**: Advanced include/exclude capabilities for bulk operations

## 🔒 Security Features

All tools implement comprehensive security measures:

1. **Path Validation**: All file operations are restricted to allowed directories only
2. **Access Control**: Uses `context.isPathAllowed()` to validate every path
3. **Recursive Protection**: Prevents operations that could cause infinite loops
4. **Overwrite Protection**: Configurable safeguards against accidental file replacement
5. **Error Handling**: Consistent error responses for security violations
6. **Path Resolution**: Resolves relative paths to prevent directory traversal attacks

## 📊 Tool Organization

### **Current Structure:**
```
tools/
├── base-tool.ts                # Base class for all tools
├── tool-registry.ts           # Central tool management
├── index.ts                   # Main exports
├── filesystem/
│   ├── file/                  # File-specific operations
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── delete-file.ts
│   │   ├── copy-file.ts       # 🆕 Efficient file copying
│   │   ├── move-file.ts       # 🆕 CLI-style move/rename
│   │   └── index.ts
│   └── directory/             # Directory-specific operations
│       ├── create-directory.ts
│       ├── list-directory.ts
│       ├── search-files.ts
│       ├── copy-directory.ts  # 🆕 Bulk directory copying
│       ├── move-directory.ts  # 🆕 Directory moving/merging
│       └── index.ts
└── data-science/              # Data analysis tools
    ├── create-data-project.ts
    └── index.ts
```

### **Categories:**
- **filesystem**: File and directory operations (10 tools)
- **data-science**: Data analysis and project scaffolding tools (1 tool)

## ➕ Adding New Tools

### Step-by-Step Process

#### 1. Choose the Category and Subcategory
Determine where your tool belongs:
- `filesystem/file/` - Individual file operations
- `filesystem/directory/` - Directory and bulk operations  
- `data-science/` - Data analysis and project tools
- Create new category if needed (e.g., `development/`, `git/`, `network/`)

#### 2. Create the Tool File
Create a new file in the appropriate subcategory:
```
src/tools/[category]/[subcategory]/[tool-name].ts
```

#### 3. Implement the Tool Class
Use this template:

```typescript
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolResponse } from '../../base-tool.js'; // Adjust path as needed
import fs from 'fs/promises';
import path from 'path';

export class YourToolNameTool extends BaseTool {
  readonly name = 'your_tool_name';
  readonly description = 'Description of what your tool does';
  readonly category = 'filesystem'; // or 'data-science', etc.

  getToolDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          // Define your parameters here
          param1: {
            type: 'string',
            description: 'Description of parameter',
          },
          param2: {
            type: 'boolean',
            description: 'Optional parameter',
            default: false,
          },
        },
        required: ['param1'], // List required parameters
      },
    };
  }

  async execute(args: Record<string, any>): Promise<ToolResponse> {
    try {
      // Extract parameters
      const param1 = args.param1 as string;
      const param2 = args.param2 as boolean || false;

      // Validate security if working with paths
      if (param1.includes('/') || param1.includes('\\\\')) {
        const resolvedPath = path.resolve(param1);
        if (!this.context.isPathAllowed(resolvedPath)) {
          throw new Error(\`Access denied: \${param1}\`);
        }
      }

      // Implement your tool functionality here
      const result = await this.yourToolLogic(param1, param2);
      
      return this.createResponse(\`Success: \${result}\`);
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  private async yourToolLogic(param1: string, param2: boolean): Promise<string> {
    // Implement your tool's core functionality
    return 'result';
  }
}
```

#### 4. Export from Subcategory Index
Add your tool to `src/tools/[category]/[subcategory]/index.ts`:

```typescript
export { YourToolNameTool } from './your-tool-name.js';
```

#### 5. Update Category Index (if needed)
Ensure `src/tools/[category]/index.ts` exports the subcategory:

```typescript
export * from './[subcategory]/index.js';
```

#### 6. Register in Tool Registry
Add to `src/tools/tool-registry.ts`:

```typescript
// Add to imports
import { YourToolNameTool } from './[category]/index.js';

// Add to registerTools() method
this.registerTool(new YourToolNameTool(this.context));
```

#### 7. Build and Test
```bash
npm run build
```

### For New Categories

If creating a new category:

1. **Create directory structure**: `src/tools/new-category/`
2. **Create index file**: `src/tools/new-category/index.ts`
3. **Update main index**: Add export to `src/tools/index.ts`
4. **Update registry**: Import and register tools in `tool-registry.ts`

## 🏃‍♂️ Development Workflow

### Building
```bash
npm run build
```

### Development Mode (Auto-rebuild)
```bash
npm run dev
```

### Testing New Tools
```bash
# Build the project
npm run build

# Restart the MCP server (close Claude and run)
cd ../../../
LaunchClaude.bat
```

## 🎯 Best Practices

### Tool Design
1. **Efficiency First**: Design tools to minimize conversation usage through single operations
2. **Atomic Operations**: Each tool should perform one complete, safe operation
3. **CLI Familiarity**: Mirror familiar command-line tool behavior when possible
4. **Consistent Interface**: Follow the BaseTool pattern for all implementations
5. **Security First**: Always validate paths and inputs before processing
6. **Error Handling**: Use `createErrorResponse()` for consistent error formatting
7. **Documentation**: Include clear parameter descriptions and real-world examples

### Parameter Design
1. **Required vs Optional**: Mark parameters appropriately with sensible defaults
2. **Overwrite Protection**: Include overwrite flags for destructive operations
3. **Pattern Support**: Support wildcards and regex where applicable
4. **Type Safety**: Use proper TypeScript types for all parameters
5. **Validation**: Validate inputs before processing

### Performance Optimization
1. **Batch Operations**: Design tools to handle multiple items in single operations
2. **Streaming**: Use streaming for large file operations when possible
3. **Pattern Filtering**: Include filtering options to reduce unnecessary processing
4. **Result Limits**: Provide limits for potentially large result sets
5. **Native APIs**: Use OS-level filesystem APIs for maximum performance

## 🔄 Tool Registry Features

The `ToolRegistry` class provides:

- **Automatic Registration**: Tools are automatically registered on startup
- **Category Management**: Tools are organized by category for easy discovery
- **Dynamic Execution**: Tools are executed by name with parameter validation
- **Tool Discovery**: List available tools, categories, and tool information
- **Error Handling**: Consistent error responses across all tools
- **Performance Logging**: Startup logging shows registered tools and categories

## 📝 Logging & Monitoring

The server logs useful information on startup:
- Total number of registered tools
- Available categories and subcategories
- Tools per category for debugging
- Tool registration success/failure messages

Example startup output:
```
Enhanced Filesystem MCP server running on stdio
Registered 11 tools across 2 categories
Tool categories: filesystem, data-science
filesystem: read_file, write_file, delete_file, copy_file, move_file, create_directory, list_directory, search_files, copy_directory, move_directory
data-science: create_data_project
```

## 🚀 Future Enhancement Roadmap

### **Planned Tool Categories:**

#### **Development Tools:**
- `generate_gitignore` - Create .gitignore for different project types
- `create_python_package` - Scaffold Python packages with setup files
- `lint_code` - Code quality and style checking
- `run_command` - Safe command execution in allowed directories

#### **Git Operations:**
- `git_status` - Check repository status and changes
- `git_commit` - Create commits with validation
- `git_branch` - Branch management operations

#### **Network Tools:**
- `http_request` - Make HTTP requests for API integration
- `download_file` - Download files from URLs
- `upload_file` - Upload files to remote services

#### **Data Analysis Extensions:**
- `analyze_csv` - Deep CSV analysis with statistics
- `json_processor` - JSON parsing, validation, and transformation
- `excel_reader` - Excel file processing capabilities

### **Architecture Improvements:**
- **Plugin System**: Dynamic tool loading from external modules
- **Configuration Management**: Per-tool configuration options
- **Performance Metrics**: Tool execution timing and efficiency tracking
- **Caching Layer**: Results caching for expensive operations

## 💡 Contributing

When adding new tools:

1. **Follow Efficiency Principles**: Design for minimal tool calls and maximum single-operation value
2. **Test Thoroughly**: Verify with edge cases, large files, and error conditions
3. **Update Documentation**: Add your tool to this README with clear examples
4. **Security Review**: Ensure proper path validation and access control
5. **Performance Optimize**: Use native APIs and efficient algorithms
6. **Error Handling**: Provide helpful error messages and recovery suggestions

The modular architecture makes it easy to contribute new functionality while maintaining code quality, security standards, and conversation efficiency.

---

## 📈 Impact Summary

This MCP server represents a significant advancement in AI-filesystem interaction efficiency:

- **11 Total Tools** providing comprehensive file and directory operations
- **4 New Efficiency Tools** that dramatically reduce conversation overhead
- **50-97% Reduction** in tool calls for common file management tasks
- **Modular Architecture** for easy extension and maintenance
- **CLI-Style Familiarity** for intuitive developer experience
- **Enterprise-Grade Security** with comprehensive path validation

The result is a powerful, efficient system that makes file management conversations more productive and cost-effective while maintaining security and reliability.