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

## 🛠️ Available Tools

### Tier 1: Foundation Tools
- **`discord_test_connection`** - Test bot connectivity and permissions
- **`discord_get_bot_info`** - Get detailed bot information and server access
- **`discord_list_channels`** - List all channels in the server
- **`discord_get_channel_info`** - Get detailed information about specific channels
- **`discord_list_roles`** - List all server roles with IDs and properties

### Tier 2: Core Communication Tools
- **`discord_read_messages`** - Read recent messages with threading and analytics
- **`discord_send_message`** - Send messages with smart formatting and auto-role lookup
- **`discord_send_reply`** - Reply to specific messages with context preservation
- **`discord_search_messages`** - Search messages with regex and advanced filtering

## 📝 Important Usage Guidelines

### Discord Role Mentions

**CRITICAL**: Discord role mentions require specific formatting to work properly.

#### The Wrong Way ❌
```
@regulars  # This appears as text but won't ping anyone
```

#### The Right Way ✅
```
<@&ROLE_ID>  # This actually pings the role members
```

#### Automated Process
The `discord_send_message` and `discord_send_reply` tools now automatically handle role mentions:

1. **Auto-detection**: Detects plain text role mentions like `@rolename`
2. **Role lookup**: Automatically queries server roles to find the matching role ID
3. **Format conversion**: Converts `@rolename` to `<@&ROLE_ID>` before sending
4. **Error handling**: Provides clear errors if role is not found or not mentionable

#### Manual Process (if needed)
If you need to manually get role information:

1. Use `discord_list_roles` to get all server roles and their IDs
2. Find the role you want to mention in the results
3. Copy the `mentionTag` value (e.g., `<@&123456789>`)
4. Use that exact format in your message

#### Safety Features
- **@everyone protection**: @everyone and @here are ALWAYS blocked regardless of settings
- **Permission validation**: Only mentionable roles can be mentioned
- **Error recovery**: Falls back to plain text if role lookup fails

### Message Sending Best Practices

1. **Role Mentions**: Use plain text like `@rolename` - the tool will convert automatically
2. **Long Messages**: Messages over 2000 characters are automatically split intelligently
3. **Safety**: @everyone/@here are blocked for safety - no exceptions
4. **Rate Limiting**: Built-in delays prevent hitting Discord's rate limits

### Search Patterns

The search tool supports multiple patterns:
- **Plain text**: `hello world`
- **Wildcards**: `test*ing` or `wh?t`
- **Regex**: `/^hello/i` or `/user\d+/`

## 🚀 Usage Examples

### Basic Message Sending
```
Send message to #general: "Hello @regulars! Testing the new bot features."
```

### Advanced Search
```
Search for messages containing "project" from the last week in #dev-chat
```

### Analytics
```
Read the last 100 messages from #general and summarize the conversation topics
```

## 🔒 Security Features

- Bot tokens are handled securely through environment variables
- All operations respect Discord's rate limits and API guidelines
- Permission validation ensures bot only performs authorized actions
- **@everyone/@here mentions are completely blocked** to prevent accidental mass pings
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
- **Auto-discovery**: Automatically resolve references (roles, channels, users)

These patterns are directly applicable to future integrations like GitHub, Spotify, and other external services.

## 🚨 Common Issues & Solutions

### Role Mentions Not Working
- **Problem**: Using `@rolename` format doesn't ping anyone
- **Solution**: Tools now auto-convert plain text role mentions to proper format
- **Manual check**: Use `discord_list_roles` to verify role exists and is mentionable

### Bot Permissions
- **Problem**: Bot can't send messages or read channels
- **Solution**: Check bot role permissions in Discord server settings
- **Required perms**: View Channels, Send Messages, Read Message History, Use External Emojis

### Rate Limiting
- **Problem**: Messages failing to send
- **Solution**: Built-in rate limiting should prevent this, but reduce frequency if needed

### Message Content Intent
- **Problem**: Can't read message content, only metadata
- **Solution**: Enable "Message Content Intent" in Discord Developer Portal → Bot settings