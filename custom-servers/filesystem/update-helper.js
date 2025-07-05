// This script will help us update all the TypeScript files to use CallToolResult

const filesToUpdate = [
  "src/tools/data-science/create-data-project.ts",
  "src/tools/filesystem/directory/copy-directory.ts", 
  "src/tools/filesystem/directory/create-directory.ts",
  "src/tools/filesystem/directory/list-directory.ts",
  "src/tools/filesystem/directory/move-directory.ts",
  "src/tools/filesystem/directory/search-files.ts",
  "src/tools/filesystem/file/copy-file.ts",
  "src/tools/filesystem/file/delete-file.ts", 
  "src/tools/filesystem/file/edit-file-patch.ts",
  "src/tools/filesystem/file/move-file.ts"
];

console.log("Files that need updating:");
filesToUpdate.forEach((file, index) => {
  console.log(`${index + 1}. ${file}`);
});

console.log("\nFor each file, you need to:");
console.log("1. Change import from: import { Tool } from '@modelcontextprotocol/sdk/types.js';");
console.log("2. To: import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';");
console.log("3. Change method signature from: Promise<ToolResponse>");
console.log("4. To: Promise<CallToolResult>");