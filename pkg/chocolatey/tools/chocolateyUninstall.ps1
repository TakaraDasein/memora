$ErrorActionPreference = 'Stop'

$packageName = 'memora-mcp'
$installDir  = Join-Path $env:ChocolateyBinRoot $packageName

Uninstall-BinFile -Name 'memora-mcp'

if (Test-Path $installDir) {
  Remove-Item $installDir -Recurse -Force
}
