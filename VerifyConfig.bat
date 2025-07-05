@echo off
echo ================================================================
echo                   MCP Configuration Verification
echo ================================================================
echo.

set CLAUDE_CONFIG="%USERPROFILE%\AppData\Roaming\Claude\claude_desktop_config.json"

echo Current Claude Desktop Configuration:
echo File: %CLAUDE_CONFIG%
echo.

if exist %CLAUDE_CONFIG% (
    echo Contents:
    type %CLAUDE_CONFIG%
    echo.
    echo.
    echo Checking for old npm server references...
    findstr /i "npx" %CLAUDE_CONFIG% >nul
    if %ERRORLEVEL% equ 0 (
        echo ❌ Found old npm server references!
        findstr /i "npx" %CLAUDE_CONFIG%
    ) else (
        echo ✅ No old npm server references found
    )
    
    echo.
    echo Checking for enhanced server...
    findstr /i "enhanced-filesystem" %CLAUDE_CONFIG% >nul
    if %ERRORLEVEL% equ 0 (
        echo ✅ Enhanced filesystem server configured!
        findstr /i "enhanced-filesystem" %CLAUDE_CONFIG%
    ) else (
        echo ❌ Enhanced server not found in config
    )
    
) else (
    echo ❌ Claude config file not found!
)

echo.
pause