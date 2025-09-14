param(
  [string]$ApiKey
)

$base = Join-Path $env:LOCALAPPDATA 'nvm\v22.7.0'
if (-not (Test-Path $base)) {
  Write-Error 'Node v22.7.0 not found. Install with nvm-windows: nvm install 22.7.0; nvm use 22.7.0'
  exit 1
}

if ($ApiKey) {
  $env:API_KEY = $ApiKey
} elseif (-not $env:API_KEY) {
  Write-Host 'Hint: pass -ApiKey <your-key> or set $env:API_KEY'
}

$env:Path = $base + ';' + $env:Path
$node = Join-Path $base 'node.exe'
$npxjs = Join-Path $base 'node_modules\npm\bin\npx-cli.js'

& $node $npxjs -y @testsprite/testsprite-mcp@latest server

