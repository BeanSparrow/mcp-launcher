# Discord MCP Server

A Model Context Protocol (MCP) server for Discord integration, providing tools for reading, analyzing, and interacting with Discord servers from Claude AI.

## 🏗️ Architecture

This server follows the same modular architecture as the filesystem server, with tools organized by functionality:

```
src/
├── index.ts                    # Main server entry point
└── tools/
    ├── base-discord-tool.ts    # Base class for Discord tools
    ├── discord-tool-registry.ts # Tool management
    ├── index.ts               # Main exports
    ├── auth/                  # Authentication tools
    ├── messaging/             # Message read/write operations  
    ├── channels/              # Channel information and management
    └── analytics/             # Data analysis and insights
```

## 🔧 Setup

### 1. Install Dependencies
```bash
cd custom-servers/discord
npm install
```

### 2. Build the Server
```bash
npm run build
```

### 3. Configure Discord Bot
You'll need to create a Discord application and bot:

1. Go to https://discord.com/developers/applications
2. Create a New Application
3. Go to the "Bot" section and create a bot
4. Copy the bot token
5. Add the bot to your server with appropriate permissions

### 4. Environment Variables
Add to your `.env` file:
```bash
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_client_id
DISCORD_GUILD_ID=your_server_guild_id (optional)
```

### 5. Configure MCP
The server is automatically configured in `system/mcp_config.json` when the launcher is used.

## 🛠️ Available Tool Categories

### Authentication
- Bot token validation
- Permission checking

### Messaging
- Read messages from channels
- Send messages to channels
- Search message history
- Message analysis

### Channels
- List server channels
- Get channel information
- Channel permissions

### Analytics
- User activity analysis
- Sentiment analysis
- Conversation trends
- Server insights

## 🚀 Usage

Once configured, the Discord tools will be available through the MCP launcher. Tools are accessed via the tool registry and can be used individually or combined for complex workflows.

### Example Workflows:
- **Daily Digest**: Read overnight messages → Analyze content → Create summary
- **Sentiment Monitoring**: Analyze channel mood → Identify issues → Report trends  
- **Activity Tracking**: Monitor user engagement → Generate activity reports
- **Smart Responses**: Detect questions → Provide helpful responses

## 🔒 Security

- Bot tokens are handled securely through environment variables
- All operations respect Discord's rate limits and API guidelines
- Permission validation ensures bot only performs authorized actions
- No message content is stored permanently

## 📊 Development

### Adding New Tools
1. Create tool file in appropriate category directory
2. Extend BaseDiscordTool class
3. Add to category index.ts
4. Register in discord-tool-registry.ts
5. Build and test

### Testing
- Use the MCP launcher to test tool functionality
- Monitor server logs for debugging information
- Validate Discord API responses

## 🎯 Integration Patterns

This Discord server demonstrates key integration patterns that apply to other external services:

- **API Authentication**: Secure token management
- **Rate Limiting**: Respectful API usage
- **Error Handling**: Graceful failure recovery
- **Data Processing**: Transform API responses for AI consumption
- **Multi-step Workflows**: Combine multiple API calls intelligently

These patterns are directly applicable to future integrations like Team Dynamics, GitHub, Spotify, and other external services.