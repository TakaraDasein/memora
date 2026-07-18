$ErrorActionPreference = 'Stop'

$packageName = 'memora-mcp'
$version     = '0.8.1'
$url64       = "https://github.com/TakaraDasein/memora/releases/download/v${version}/memora-mcp-windows-amd64.zip"
$checksum64  = 'a602ad090ed3f49d86c55472f73f27ad7055222806a82358f2e08513e027f00f'
$installDir  = Join-Path $env:ChocolateyBinRoot $packageName

Install-ChocolateyZipPackage `
  -PackageName   $packageName `
  -Url64bit      $url64 `
  -Checksum64    $checksum64 `
  -ChecksumType64 'sha256' `
  -UnzipLocation $installDir

$binPath = Join-Path $installDir 'memora-mcp.exe'
Install-BinFile -Name 'memora-mcp' -Path $binPath

try {
  & $binPath install -y 2>&1 | Out-Null
} catch {
  Write-Warning "Agent configuration failed (non-fatal). Run manually: memora-mcp install"
}
