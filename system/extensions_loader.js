/**
 * MCP Extensions Loader
 * 
 * This script automatically loads and applies MCP server extension configurations
 * from the extensions directory when Claude Desktop starts.
 */
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Define paths
const EXTENSIONS_DIR = path.join(__dirname, '..', 'extensions');
const CONFIG_TARGET_PATH = process.env.CLAUDE_CONFIG_PATH || path.join(process.env.USER_HOME || 'C:\\Users\\YourUsername', 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');

/**
 * Load and merge extension configurations
 */
function loadExtensions() {
  console.log('Loading MCP server extensions...');
  
  // Check if extensions directory exists
  if (!fs.existsSync(EXTENSIONS_DIR)) {
    console.log('Extensions directory not found. No extensions will be loaded.');
    return;
  }
  
  // Check if target config exists, create base config if it doesn't
  let targetConfig = { mcpServers: {} };
  if (fs.existsSync(CONFIG_TARGET_PATH)) {
    try {
      targetConfig = JSON.parse(fs.readFileSync(CONFIG_TARGET_PATH, 'utf8'));
      if (!targetConfig.mcpServers) {
        targetConfig.mcpServers = {};
      }
    } catch (error) {
      console.error(`Error reading target config: ${error.message}`);
      console.log('Creating new configuration...');
    }
  }
  
  // Get all subdirectories in the extensions directory
  const extensionDirs = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  // Process each extension directory
  for (const extensionName of extensionDirs) {
    const extensionDir = path.join(EXTENSIONS_DIR, extensionName);
    console.log(`Processing extension: ${extensionName}`);
    
    // Find configuration files in the extension directory
    const configFiles = fs.readdirSync(extensionDir)
      .filter(file => file.endsWith('.json') && !file.startsWith('_'));
    
    for (const configFile of configFiles) {
      const configPath = path.join(extensionDir, configFile);
      console.log(`Loading config file: ${configFile}`);
      
      try {
        // Read and parse the extension config
        const extensionConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Process environment variables in the config
        const processedConfig = processEnvironmentVariables(extensionConfig);
        
        // Merge the extension config with the target config
        if (processedConfig.mcpServers) {
          Object.assign(targetConfig.mcpServers, processedConfig.mcpServers);
          console.log(`Added MCP servers from ${configFile}`);
        } else {
          console.log(`No MCP servers found in ${configFile}`);
        }
      } catch (error) {
        console.error(`Error processing ${configFile}: ${error.message}`);
      }
    }
  }
  
  // Write the merged config back to the target location
  try {
    fs.writeFileSync(CONFIG_TARGET_PATH, JSON.stringify(targetConfig, null, 2));
    console.log(`Extensions loaded successfully. Config written to: ${CONFIG_TARGET_PATH}`);
  } catch (error) {
    console.error(`Error writing config: ${error.message}`);
  }
}

/**
 * Process environment variables in a configuration object
 * Replaces ${VAR_NAME} patterns with values from process.env
 */
function processEnvironmentVariables(obj) {
  if (!obj) return obj;
  
  // Create a deep copy of the object
  const result = JSON.parse(JSON.stringify(obj));
  
  // Helper function to walk through object properties
  function processValue(val) {
    if (typeof val === 'string') {
      // Replace environment variables in string
      return val.replace(/\${([^}]+)}/g, (match, varName) => {
        return process.env[varName] || '';
      });
    } else if (Array.isArray(val)) {
      // Process each array item
      return val.map(item => processValue(item));
    } else if (val !== null && typeof val === 'object') {
      // Process object recursively
      Object.keys(val).forEach(key => {
        val[key] = processValue(val[key]);
      });
    }
    return val;
  }
  
  return processValue(result);
}

// Execute the function
loadExtensions();