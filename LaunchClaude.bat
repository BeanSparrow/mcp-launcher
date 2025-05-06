@echo off
echo Starting Claude Desktop with MCP integration...

:: Set paths
set SCRIPT_DIR=%~dp0
set BOOTSTRAP_PATH=%SCRIPT_DIR%system\bootstrap.js
set EXTENSIONS_LOADER=%SCRIPT_DIR%system\extensions_loader.js
set CLAUDE_APP_PATH=C:\Users\Steve\AppData\Local\AnthropicClaude\Claude.exe

:: Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js not found in PATH
    echo Please install Node.js to use this launcher.
    pause
    exit /b 1
) else (
    set NODE_CMD=node
)

:: Install dotenv dependency if not present
echo Checking for required dependencies...
if not exist "%SCRIPT_DIR%node_modules\dotenv" (
    echo Installing dotenv dependency...
    npm install dotenv --prefix "%SCRIPT_DIR%."
)

:: Load extensions first
echo Loading MCP extensions...
%NODE_CMD% "%EXTENSIONS_LOADER%"
if %ERRORLEVEL% neq 0 (
    echo WARNING: Extensions loader encountered issues.
    echo Some extensions may not be properly loaded.
)

:: Run the bootstrap script to apply MCP configuration
echo Running MCP configuration bootstrap script...
%NODE_CMD% "%BOOTSTRAP_PATH%"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Bootstrap script failed.
    pause
    exit /b 1
)

:: Launch Claude Desktop
echo Bootstrap complete. Launching Claude Desktop...
start "" "%CLAUDE_APP_PATH%"

echo.
echo Launch sequence complete. Claude Desktop is running with MCP integration.
echo Press any key to close this window. The application will continue running.
pause >nul
exit /b 0