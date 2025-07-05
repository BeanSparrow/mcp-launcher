# CLAUDE.md - Project Context

## 🎯 What This Project Is

**MCP Launcher** is a development environment for building and managing Model Context Protocol (MCP) servers that extend Claude AI's capabilities. Think of it as a "3D printer for AI tools" - you start with basic capabilities and use them to build increasingly sophisticated integrations.

## 🏗️ Current Architecture

### Core Components
- **MCP Launcher System** - Main orchestration and server management
- **Enhanced Filesystem Server** - Advanced file operations, data science tools
- **Discord Integration Framework** - In-development service integration
- **Tool Registry System** - Automatic discovery and categorization

### Directory Structure
```
mcp_launcher/
├── custom-servers/           # MCP server implementations
│   ├── enhanced-filesystem/  # ✅ Complete - filesystem + data science tools
│   └── discord/             # 🚧 Framework ready, tools pending
├── system/                  # Core launcher infrastructure
├── extensions/              # Extension configurations
└── .env.template           # Configuration template
```

## 🔧 Enhanced Filesystem Server (Complete)

**Location:** `custom-servers/enhanced-filesystem/`

**Capabilities:**
- Core file operations (read, write, create, list, search)
- Data science project scaffolding (analysis/ml/dashboard types)
- CSV analysis with statistics and profiling
- Jupyter notebook generation with templates
- Python package creation with proper structure
- .gitignore generation for multiple project types
- Power BI template generation with DAX measures

**Status:** ✅ Fully implemented and functional

## 🔌 Discord Integration (In Development)

**Location:** `custom-servers/discord/`

**Current Status:**
- ✅ Complete framework architecture
- ✅ Base tool class (`BaseDiscordTool`)
- ✅ Tool registry system (`DiscordToolRegistry`)
- ✅ Server setup with MCP SDK integration
- ✅ Environment configuration ready
- ❌ **No actual Discord tools implemented yet**

**Framework Structure:**
```
discord/src/tools/
├── auth/         # Bot authentication, permission checking
├── messaging/    # Read/send messages, search history
├── channels/     # List channels, get info, permissions
└── analytics/    # User activity, sentiment analysis
```

**What's Ready:**
- Tool inheritance pattern via `BaseDiscordTool`
- Automatic tool discovery and registration
- Category-based organization
- Environment configuration for bot tokens
- MCP server integration

**What's Missing:**
- Actual tool implementations in each category
- Discord.js integration in the tools
- Error handling for Discord API
- Rate limiting and permission validation

## 🚀 Development Status

### Completed ✅
1. **Core MCP launcher infrastructure**
2. **Enhanced filesystem server with data science tools**
3. **Discord framework architecture**
4. **Environment configuration system**
5. **Documentation and setup scripts**

### In Progress 🚧
1. **Discord tool implementations** (main current focus)
2. **Testing and validation workflows**

### Planned 📋
1. **Additional service integrations** (GitHub, Spotify, etc.)
2. **Advanced analytics and reporting**
3. **Web dashboard for management**

## 🎯 Next Development Steps

### Immediate Priorities (Discord Tools)
1. **Authentication tools** - Bot validation, permission checking
2. **Basic messaging** - Read messages, send messages
3. **Channel operations** - List channels, get channel info
4. **Simple analytics** - User activity tracking

### Implementation Pattern
Each Discord tool should:
1. Extend `BaseDiscordTool` class
2. Define clear input/output schemas
3. Handle Discord API errors gracefully
4. Respect rate limits and permissions
5. Register in the appropriate category

### Example Tool Structure
```typescript
export class ReadMessagesTool extends BaseDiscordTool {
  name = 'discord_read_messages';
  description = 'Read recent messages from a Discord channel';
  category = 'messaging';
  
  async execute(args: { channel_id: string; limit?: number }) {
    // Discord.js implementation
  }
}
```

## 🔑 Key Configuration

### Environment Setup
- Copy `.env.template` to `.env`
- Configure paths for Claude Desktop app
- Add Discord bot token when implementing Discord tools
- Set filesystem access paths

### Discord Bot Requirements (When Implementing)
- Create Discord application at https://discord.com/developers/applications
- Generate bot token
- Configure appropriate permissions
- Add bot to target servers

## 🧠 Development Philosophy

### "3D Printer" Approach
- Start with basic tools
- Use existing tools to build more sophisticated ones
- Each integration becomes a building block for others
- Focus on composable, reusable patterns

### Modular Architecture
- Each service is a separate MCP server
- Tools are organized by functionality categories
- Clear separation of concerns
- Easy to add new integrations

### Quality Focus
- Comprehensive error handling
- Rate limiting and API respect
- Security-first credential management
- Clear documentation and examples

## 📚 Key Files to Understand

### Core Framework
- `system/mcp_config.json` - Server registry
- `system/bootstrap.js` - Server initialization
- `LaunchClaude.bat` - Main launcher

### Discord Framework
- `custom-servers/discord/src/index.ts` - Main server
- `custom-servers/discord/src/tools/base-discord-tool.ts` - Tool base class
- `custom-servers/discord/src/tools/discord-tool-registry.ts` - Tool management

### Enhanced Filesystem (Reference Implementation)
- `custom-servers/enhanced-filesystem/src/index.ts` - Complete working example

## 🎯 Current Focus

**Primary Goal:** Implement the first Discord tools to validate the framework and provide immediate value.

**Success Criteria:**
- Bot can authenticate with Discord
- Can read messages from channels
- Can send basic messages
- Framework scales to additional tools easily

**Next Session Topics:**
- Which Discord tools to implement first
- Testing strategy for Discord integration
- Error handling patterns
- Rate limiting implementation
