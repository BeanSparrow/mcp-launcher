# Claude MCP Bootstrap Quickstart (Windows)

A streamlined bootstrap system for quickly setting up Model Context Protocol (MCP) integration with Claude Desktop on Windows, providing filesystem access, GitHub integration, and other enhanced functionality. **Note: This setup is currently designed for Windows users only.**

## Overview

This repository provides a configuration system for Claude Desktop that enables the Model Context Protocol (MCP) integration. MCP allows Claude to access and interact with your filesystem and other services, providing enhanced capabilities beyond the standard Claude experience.

## Features

- **Filesystem Integration**: Enables Claude Desktop to access and modify files in specified directories
- **GitHub Integration**: Connect Claude to your GitHub repositories for code management
- **Extensible Design**: Add additional MCP servers through the extensions system
- **Environment Variables**: Uses .env file for personal paths and tokens, making it easy to share the setup
- **Automatic Configuration**: Applies your settings when launching Claude Desktop

## Directory Structure

```
claude-mcp-bootstrap-quickstart/
├── .env                       # Personal environment variables (gitignored)
├── .env.template              # Template for environment variables
├── .gitignore                 # Specifies intentionally untracked files
├── LaunchClaude.bat           # Main launcher script
├── README.md                  # This documentation file
├── system/                    # Core system files
│   ├── bootstrap.js           # Script that applies configurations
│   ├── extensions_loader.js   # Loads extension configurations
│   ├── mcp_config.json        # MCP configuration
│   ├── startup_config.json    # Controls how configurations are applied
│   └── deprecated/            # Older files no longer in use
├── extensions/                # Extension-specific configurations
│   └── github/                # GitHub MCP server extension
│       └── github-mcp.json    # GitHub MCP server configuration
└── user/                      # For user-specific configurations
```

## Installation & Setup (Windows)

1. Ensure you have [Node.js](https://nodejs.org/) installed on your Windows system
2. Ensure Claude Desktop is installed on Windows
3. Clone or download this repository
4. Copy `.env.template` to `.env` and update with your personal Windows paths
5. Run `LaunchClaude.bat` to start Claude Desktop with MCP integration

## Environment Configuration

The `.env` file contains personal configuration values that should not be committed to source control. Copy `.env.template` to `.env` and update the values.

**Note**: By default, the filesystem server directory is set to `User\Documents\Claude` in the `.env.template`, but you can modify the `MCP_FILESYSTEM_PATHS` value to any directory you want Claude to access:

```
# User specific paths
USER_HOME=C:\\Users\\YourUsername
CLAUDE_DOCS_PATH=C:\\Users\\YourUsername\\Documents\\Claude
CLAUDE_APP_PATH=C:\\Users\\YourUsername\\AppData\\Local\\AnthropicClaude\\Claude.exe
CLAUDE_CONFIG_PATH=C:\\Users\\YourUsername\\AppData\\Roaming\\Claude\\claude_desktop_config.json

# Node.js path (if not in system PATH)
# Leave empty to use system PATH
NODE_PATH=

# MCP Configuration
MCP_FILESYSTEM_ENABLED=true
# Default is User\Documents\Claude but you can change this to any directory you want Claude to access
MCP_FILESYSTEM_PATHS=C:\\Users\\YourUsername\\Documents\\Claude

# GitHub integration
GITHUB_TOKEN=your_personal_access_token_here
```

## Usage

### Launching Claude Desktop with MCP Integration

Simply run `LaunchClaude.bat` from the repository root. This will:
1. Load environment variables from `.env`
2. Load any extension configurations
3. Apply your MCP configuration
4. Launch Claude Desktop with MCP integration enabled

### Customizing MCP Configuration

To modify the MCP server settings:

1. Edit `system/mcp_config.json` for core settings
2. Edit extension-specific configurations in their respective folders
3. Update environment variables in the `.env` file
4. Launch Claude Desktop using `LaunchClaude.bat`

## Available Extensions

### GitHub Integration

The GitHub MCP server provides tools to:

- List and browse repositories
- Create and manage pull requests
- Work with issues
- Execute Git operations
- Browse repository files
- Manage repository settings

#### Setting Up GitHub Integration

1. Create a GitHub Personal Access Token:
   - Visit [GitHub's token settings](https://github.com/settings/tokens)
   - Generate a new token with appropriate repository permissions
   - Copy the token value

2. Add your GitHub token to the `.env` file:
   ```
   GITHUB_TOKEN=your_personal_access_token_here
   ```

3. Restart Claude Desktop using the launcher

#### GitHub Usage Examples

Once configured, you can ask Claude to perform GitHub operations like:

- "List my GitHub repositories"
- "Create a new pull request from my current branch to main"
- "Show me open issues in my repository"
- "Commit and push my changes to GitHub"
- "Clone a repository from GitHub"

## How It Works

The system follows this process when launching Claude Desktop:

1. `LaunchClaude.bat` loads environment variables from `.env`
2. The extensions loader finds and processes extension configurations
3. The bootstrap script applies core MCP configuration
4. All configurations are merged with environment variables resolved
5. Configuration is applied to Claude Desktop's settings
6. Claude Desktop is launched with all MCP servers enabled

## Adding New Extensions

To add a new MCP server extension:

1. Create a new directory under `extensions/`
2. Add a JSON configuration file for the MCP server
3. Update `.env.template` and your `.env` with any required variables
4. Add documentation in the extension directory
5. Restart Claude Desktop to apply the changes

## Troubleshooting (Windows)

If you encounter issues on your Windows system:

1. **Environment Variables**: Ensure you've copied `.env.template` to `.env` and updated the values
2. **Node.js Missing**: Ensure Node.js is installed and in your PATH, or set the `NODE_PATH` in `.env`
3. **Claude Desktop Path**: Verify the `CLAUDE_APP_PATH` in `.env` matches your installation
4. **GitHub Issues**:
   - Verify your GitHub token has the necessary permissions
   - Check the Claude Desktop logs for GitHub MCP server errors
   - Ensure your token is correctly set in the `.env` file
5. **Bootstrap Errors**: Check the command prompt output for specific error messages

## Contributing

If you want to contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Create a pull request

Remember to never commit your `.env` file as it contains personal paths and tokens.

## Reference

### MCP Configuration Options

The `mcp_config.json` file supports these primary configuration sections:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "${MCP_FILESYSTEM_PATHS}"
      ]
    }
  },
  "mcp": {
    "enabled": true,
    "accessControl": {
      "allowedDirectories": [
        "${MCP_FILESYSTEM_PATHS}"
      ],
      "allowFileOperations": true
    }
  }
}
```

### GitHub Extension Configuration

The GitHub extension uses this configuration format:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Startup Configuration Options

The `startup_config.json` file controls how configurations are applied:

```json
{
  "version": "1.0",
  "configType": "startup",
  "enabled": true,
  "mergeStrategy": "merge",  // How to apply configurations: "merge" or "replace"
  "backupOriginal": true,    // Whether to backup the original configuration
  "backupPath": "${CLAUDE_CONFIG_PATH}.backup" // Where to store backups
}
```

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [GitHub MCP Server Documentation](https://github.com/modelcontextprotocol/servers)
- [GitHub API Documentation](https://docs.github.com/en/rest)

## License

This project is intended for personal use to enhance Claude Desktop functionality.