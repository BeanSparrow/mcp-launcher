# MCP Launcher 🚀

A comprehensive Model Context Protocol (MCP) development environment that enables rapid prototyping and deployment of AI-enhanced tools. This launcher provides a foundation for building custom MCP servers and integrating external services with Claude AI.

## 🎯 Overview

MCP Launcher follows a modular "3D printer" philosophy - start with basic capabilities and use them to build increasingly sophisticated tools. Currently includes filesystem operations, development scaffolding, and a Discord integration framework.

## ✨ Features

### 🔧 Core Infrastructure
- **MCP Server Management** - Automated server discovery and registration
- **Environment Configuration** - Template-based setup with secure credential management
- **Development Tools** - Hot reload, debugging, and testing utilities
- **Cross-Platform Support** - Windows batch scripts with extensible architecture

### 📁 Built-in Capabilities
- **Enhanced Filesystem** - Advanced file operations, search, and analysis
- **Data Science Tools** - Project scaffolding, CSV analysis, Jupyter notebook generation
- **Development Automation** - Package creation, dependency management, .gitignore generation
- **Power Platform Integration** - Power BI templates and DAX generation

### 🔌 Custom Server Framework
- **Discord Integration** (In Development) - Message reading, channel management, analytics
- **Modular Architecture** - Easy addition of new service integrations
- **Tool Registry System** - Automatic tool discovery and categorization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Claude Desktop App
- Git (for cloning and development)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/mcp_launcher.git
   cd mcp_launcher
   ```

2. **Set up environment:**
   ```bash
   # Copy template and configure
   copy .env.template .env
   # Edit .env with your paths and tokens
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Build all servers:**
   ```bash
   # Windows
   SetupLocal.bat
   
   # Manual build
   cd custom-servers/enhanced-filesystem && npm install && npm run build
   cd ../discord && npm install && npm run build
   ```

5. **Launch Claude with MCP:**
   ```bash
   LaunchClaude.bat
   ```

### First Steps

Try these commands in Claude to test your setup:

```
"Create a data science project called 'test_project' of type 'analysis'"
"List all files in my current directory"
"Generate a Python .gitignore file"
```

## 📁 Project Structure

```
mcp_launcher/
├── custom-servers/           # MCP server implementations
│   ├── enhanced-filesystem/  # Core filesystem and data tools
│   └── discord/             # Discord integration (in development)
├── extensions/              # Extension configurations
├── system/                  # Core launcher system
│   ├── bootstrap.js         # MCP server initialization
│   ├── mcp_config.json     # Server registry
│   └── startup_config.json # Launch configuration
├── .env.template           # Environment variable template
├── LaunchClaude.bat       # Main launcher script
└── SetupLocal.bat         # Initial setup script
```

## 🛠️ Development

### Adding New MCP Servers

1. **Create server directory:**
   ```bash
   mkdir custom-servers/my-new-server
   cd custom-servers/my-new-server
   npm init -y
   ```

2. **Install MCP SDK:**
   ```bash
   npm install @modelcontextprotocol/sdk
   npm install -D typescript @types/node
   ```

3. **Create server implementation:**
   ```typescript
   // src/index.ts
   import { Server } from '@modelcontextprotocol/sdk/server/index.js';
   // ... implement your server
   ```

4. **Register in configuration:**
   ```json
   // system/mcp_config.json
   {
     "my-new-server": {
       "command": "node",
       "args": ["custom-servers/my-new-server/dist/index.js"]
     }
   }
   ```

### Discord Integration Development

The Discord server framework is ready for tool implementation:

```typescript
// Example: custom-servers/discord/src/tools/messaging/send-message.ts
import { BaseDiscordTool } from '../base-discord-tool.js';

export class SendMessageTool extends BaseDiscordTool {
  name = 'discord_send_message';
  description = 'Send a message to a Discord channel';
  category = 'messaging';
  
  async execute(args: { channel_id: string; message: string }) {
    // Implementation here
  }
}
```

## 🔧 Configuration

### Environment Variables

Copy `.env.template` to `.env` and configure:

```bash
# User Configuration
USER_HOME="C:\\Users\\YourName"
CLAUDE_DOCS_PATH="C:\\Users\\YourName\\Documents\\Claude"
CLAUDE_APP_PATH="C:\\Users\\YourName\\AppData\\Local\\AnthropicClaude\\Claude.exe"

# MCP Settings
MCP_FILESYSTEM_ENABLED=true
MCP_FILESYSTEM_PATHS="C:\\Users\\YourName\\Documents\\Claude"

# Service Integrations
GITHUB_TOKEN=your_github_token_here
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id
```

### Security Notes

- Never commit `.env` files (already in .gitignore)
- Use `.env.template` to document required variables
- Store sensitive tokens in environment variables only

## 🎯 Use Cases

### Data Science Workflow
- Rapid project scaffolding with proper structure
- CSV analysis and data profiling
- Jupyter notebook generation with templates
- Power BI integration for visualization

### Development Automation
- Package creation with proper structure
- Dependency management and requirements generation
- Code analysis and documentation
- Git workflow automation

### Service Integration
- Discord bot management and analytics
- GitHub repository operations
- API testing and documentation
- Workflow automation across platforms

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow the modular architecture patterns
- Add comprehensive tool documentation
- Include error handling and validation
- Test with real-world scenarios
- Update configuration templates as needed

## 📚 Resources

- [Model Context Protocol](https://modelcontextprotocol.io/) - Official MCP documentation
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - SDK reference
- [Claude Desktop](https://claude.ai/desktop) - Claude Desktop application
- [Discord.js](https://discord.js.org/) - Discord API wrapper

## 🐛 Troubleshooting

### Common Issues

**MCP Server Not Loading:**
- Check server build: `npm run build` in server directory
- Verify paths in `system/mcp_config.json`
- Check console output in `LaunchClaude.bat`

**Permission Errors:**
- Ensure Claude has access to configured filesystem paths
- Check Windows execution policies for batch scripts
- Verify environment variable paths are correct

**Discord Integration:**
- Verify bot token and permissions
- Check guild ID configuration
- Ensure bot is added to target server

### Debug Mode

Enable detailed logging by modifying server configurations or checking console output during launch.

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Anthropic for Claude and MCP framework
- Open source community for tools and inspiration
- Contributors and testers

---

**Ready to enhance your AI development workflow?** Start building! 🚀