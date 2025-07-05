/**
 * Claude Desktop MCP Configuration Bootstrap
 * 
 * This script applies the MCP server configuration when Claude Desktop starts.
 * It uses environment variables from .env file to avoid hardcoding paths.
 */
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration paths from environment variables with fallbacks
const REPO_ROOT = path.join(__dirname, '..');
const STARTUP_CONFIG_PATH = path.join(__dirname, 'startup_config.json');
const MCP_CONFIG_PATH = path.join(__dirname, 'mcp_config.json');
const TARGET_CONFIG_PATH = process.env.CLAUDE_CONFIG_PATH || path.join(process.env.USER_HOME || 'C:\\Users\\YourUsername', 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');

/**
 * Substitute environment variables in a string
 * @param {string} str - String that may contain ${VAR_NAME} placeholders
 * @returns {string} - String with environment variables substituted
 */
function substituteEnvironmentVariables(str) {
  if (typeof str !== 'string') return str;
  
  return str.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const value = process.env[varName];
    if (value === undefined) {
      console.warn(`Warning: Environment variable ${varName} is not defined`);
      return match; // Keep the placeholder if variable is not found
    }
    return value;
  });
}

/**
 * Recursively substitute environment variables in an object
 * @param {any} obj - Object to process
 * @returns {any} - Object with environment variables substituted
 */
function processEnvironmentVariables(obj) {
  if (typeof obj === 'string') {
    return substituteEnvironmentVariables(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => processEnvironmentVariables(item));
  } else if (obj && typeof obj === 'object') {
    const processed = {};
    for (const [key, value] of Object.entries(obj)) {
      processed[key] = processEnvironmentVariables(value);
    }
    return processed;
  }
  return obj;
}

/**
 * Bootstrap the MCP configuration
 */
function bootstrapConfiguration() {
  console.log('Starting Claude Desktop MCP configuration bootstrap...');
  
  // Check if .env file is loaded properly
  if (!process.env.USER_HOME) {
    console.warn('Warning: Environment variables not loaded correctly. Using default paths.');
  }
  
  // Check if config files exist
  if (!fs.existsSync(STARTUP_CONFIG_PATH)) {
    console.log('No startup configuration found. Using default configuration.');
    return false;
  }
  
  if (!fs.existsSync(MCP_CONFIG_PATH)) {
    console.error(`MCP configuration not found at: ${MCP_CONFIG_PATH}`);
    return false;
  }
  
  try {
    // Read configs
    const startupConfig = JSON.parse(fs.readFileSync(STARTUP_CONFIG_PATH, 'utf8'));
    let mcpConfig = JSON.parse(fs.readFileSync(MCP_CONFIG_PATH, 'utf8'));
    
    // Process all environment variables in the configuration
    console.log('Processing environment variables in MCP configuration...');
    mcpConfig = processEnvironmentVariables(mcpConfig);
    
    // Additional filesystem server path handling (for backward compatibility)
    if (mcpConfig.mcpServers && mcpConfig.mcpServers['filesystem'] && mcpConfig.mcpServers['filesystem'].args) {
      const lastArgIndex = mcpConfig.mcpServers['filesystem'].args.length - 1;
      if (lastArgIndex >= 0) {
        const paths = (process.env.MCP_FILESYSTEM_PATHS || '').split(',').map(p => p.trim().replace(/"/g, ''));
        if (paths.length > 0 && paths[0]) {
          mcpConfig.mcpServers['filesystem'].args[lastArgIndex] = paths[0];
        }
      }
    }
    
    // Update allowed directories with environment variables
    if (mcpConfig.mcp && mcpConfig.mcp.accessControl && mcpConfig.mcp.accessControl.allowedDirectories) {
      const paths = (process.env.MCP_FILESYSTEM_PATHS || '').split(',').map(p => p.trim().replace(/"/g, ''));
      if (paths.length > 0 && paths[0]) {
        mcpConfig.mcp.accessControl.allowedDirectories = paths;
      }
    }
    
    // Log Discord configuration status
    if (mcpConfig.mcpServers && mcpConfig.mcpServers['discord']) {
      console.log('Discord server configuration processed:');
      console.log('- Bot token configured:', mcpConfig.mcpServers.discord.env?.DISCORD_BOT_TOKEN ? 'Yes' : 'No');
      console.log('- Client ID configured:', mcpConfig.mcpServers.discord.env?.DISCORD_CLIENT_ID ? 'Yes' : 'No');
      console.log('- Guild ID configured:', mcpConfig.mcpServers.discord.env?.DISCORD_GUILD_ID ? 'Yes' : 'No');
    }
    
    // Check if the startup config is enabled
    if (!startupConfig.enabled) {
      console.log('Startup configuration is disabled. Using default configuration.');
      return false;
    }
    
    // Update paths in startup config with environment variables
    const sourcePath = MCP_CONFIG_PATH;
    const targetPath = TARGET_CONFIG_PATH;
    
    console.log(`Target config path: ${targetPath}`);
    
    // Backup the original configuration if needed
    if (startupConfig.backupOriginal && fs.existsSync(targetPath)) {
      const backupPath = targetPath + '.backup';
      console.log(`Backing up original configuration to: ${backupPath}`);
      fs.copyFileSync(targetPath, backupPath);
    }
    
    // Apply the configuration based on strategy
    if (startupConfig.mergeStrategy === 'replace' || !fs.existsSync(targetPath)) {
      // Replace the entire configuration
      console.log('Replacing MCP configuration...');
      fs.writeFileSync(targetPath, JSON.stringify(mcpConfig, null, 2));
    } 
    else if (startupConfig.mergeStrategy === 'merge' && fs.existsSync(targetPath)) {
      // Merge with existing configuration
      console.log('Merging MCP configurations...');
      const targetConfig = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      const mergedConfig = mergeConfigurations(targetConfig, mcpConfig);
      fs.writeFileSync(targetPath, JSON.stringify(mergedConfig, null, 2));
    }
    else {
      // Default to replace
      console.log('Using replace strategy by default...');
      fs.writeFileSync(targetPath, JSON.stringify(mcpConfig, null, 2));
    }
    
    console.log('MCP configuration bootstrap completed successfully.');
    console.log('Filesystem server configured with path:', process.env.MCP_FILESYSTEM_PATHS);
    console.log('Discord server configured with environment variables from .env file');
    return true;
    
  } catch (error) {
    console.error('Error during configuration bootstrap:', error.message);
    return false;
  }
}

/**
 * Merge two configuration objects
 * @param {Object} target - The target configuration object
 * @param {Object} source - The source configuration object
 * @returns {Object} - The merged configuration object
 */
function mergeConfigurations(target, source) {
  // Create a deep copy of the target
  const merged = JSON.parse(JSON.stringify(target));
  
  // Helper function for deep merging
  function deepMerge(targetObj, sourceObj) {
    Object.keys(sourceObj).forEach(key => {
      if (
        sourceObj[key] && 
        typeof sourceObj[key] === 'object' && 
        !Array.isArray(sourceObj[key]) &&
        targetObj[key] && 
        typeof targetObj[key] === 'object' && 
        !Array.isArray(targetObj[key])
      ) {
        // Recursively merge objects
        deepMerge(targetObj[key], sourceObj[key]);
      } else {
        // Replace value
        targetObj[key] = sourceObj[key];
      }
    });
  }
  
  deepMerge(merged, source);
  return merged;
}

// Execute the bootstrap function
bootstrapConfiguration();