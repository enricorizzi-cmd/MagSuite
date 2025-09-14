TestSprite MCP – Setup & Usage (Windows)

Prerequisites
- Node.js 22 (required by `@testsprite/testsprite-mcp`). Already installed with nvm-windows in this repo’s setup.
- Your TestSprite API key.

Install Node 22 with nvm-windows
1) Install nvm for Windows (one‑time):
   winget install CoreyButler.NVMforWindows --silent --accept-source-agreements --accept-package-agreements
2) Install and select Node 22:
   nvm install 22.7.0
   nvm use 22.7.0

If the current shell does not pick up Node, you can use the embedded path:
- Node: %LocalAppData%\nvm\v22.7.0\node.exe
- NPX script: %LocalAppData%\nvm\v22.7.0\node_modules\npm\bin\npx-cli.js

Start the MCP server
- Option A (script provided in this repo):
  - PowerShell
    - .\scripts\run-testsprite-mcp.ps1 -ApiKey "<your-api-key>"
  - or set once per user: setx API_KEY "<your-api-key>"
    then: .\scripts\run-testsprite-mcp.ps1

- Option B (manual):
  - PowerShell
    $base = "$env:LOCALAPPDATA\nvm\v22.7.0";
    $env:Path = $base + ';' + $env:Path;
    $env:API_KEY = "<your-api-key>";
    & "$base\node.exe" "$base\node_modules\npm\bin\npx-cli.js" -y @testsprite/testsprite-mcp@latest server

Integrate with an MCP client
- For Claude Desktop (Windows): create or edit
  %AppData%\Claude\claude_desktop_config.json
  with:
  {
    "mcpServers": {
      "TestSprite": {
        "command": "%LocalAppData%\\nvm\\v22.7.0\\npx.cmd",
        "args": ["@testsprite/testsprite-mcp@latest", "server"],
        "env": { "API_KEY": "<your-api-key>" }
      }
    }
  }
  Then restart Claude Desktop. You should see the TestSprite tool available (e.g., testsprite_generate_code_and_execute).

CLI fallback (without MCP client)
The CLI subcommand `generateCodeAndExecute` expects prior configuration created via the MCP tool (`testsprite_generate_code_and_execute`). Use the MCP integration above to generate and run tests.

Troubleshooting
- “node is not recognized” when starting the server: ensure Node 22 is in PATH or use the explicit Node path as shown above.
- Engine error `requires node >=22`: you are on Node 20; switch via `nvm use 22.7.0`.

