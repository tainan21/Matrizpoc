param(
  [Parameter(Mandatory = $true)][string]$InstalledRoot,
  [Parameter(Mandatory = $true)][string]$RunId
)

$ErrorActionPreference = 'Stop'
$appRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$package = Get-Content -LiteralPath (Join-Path $appRoot 'package.json') -Raw | ConvertFrom-Json
$installer = Join-Path $appRoot ("release\naevia-{0}-windows-x64-setup.exe" -f $package.version)
$hashPath = $installer + '.sha256'
$root = [IO.Path]::GetFullPath($InstalledRoot)
$allowed = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'NAEVIA Acceptance')).TrimEnd('\') + '\'
if (-not $root.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe NAEVIA acceptance installation path' }
if (-not (Test-Path -LiteralPath $installer -PathType Leaf) -or -not (Test-Path -LiteralPath $hashPath -PathType Leaf)) { throw 'Trusted NAEVIA installer is unavailable; run package first' }
$expectedHash = (Get-Content -LiteralPath $hashPath -Raw).Trim()
$actualHash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expectedHash -notmatch '^[a-f0-9]{64}$' -or $actualHash -ne $expectedHash) { throw 'NAEVIA installer failed integrity verification' }

$executable = Join-Path $root 'NAEVIA.exe'
$uninstaller = Join-Path $root 'Uninstall NAEVIA.exe'
if (Test-Path -LiteralPath $uninstaller -PathType Leaf) {
  $old = Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
  if ($old.ExitCode -ne 0) { throw "Existing NAEVIA uninstall failed with exit code $($old.ExitCode)" }
}
$install = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$root") -Wait -PassThru -WindowStyle Hidden
if ($install.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $executable -PathType Leaf) -or -not (Test-Path -LiteralPath $uninstaller -PathType Leaf)) { throw 'NAEVIA installation failed' }

try {
  $previousBinary = $env:NAEVIA_BINARY
  $env:NAEVIA_BINARY = $executable
  & corepack pnpm --dir $appRoot run e2e
  if ($LASTEXITCODE -ne 0) { throw "Installed NAEVIA E2E failed with exit code $LASTEXITCODE" }
}
finally {
  $env:NAEVIA_BINARY = $previousBinary
  Get-CimInstance Win32_Process -Filter "Name = 'NAEVIA.exe'" | Where-Object { $_.ExecutablePath -and [IO.Path]::GetFullPath($_.ExecutablePath) -eq $executable } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  $remove = Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
  if ($remove.ExitCode -ne 0) { throw "NAEVIA uninstall failed with exit code $($remove.ExitCode)" }
}

if (Test-Path -LiteralPath $executable) { throw 'NAEVIA uninstall left the product executable behind' }
[PSCustomObject]@{ schemaVersion = 'v1'; runId = $RunId; status = 'pass'; installerSha256 = $actualHash; installedRoot = $root; uninstalled = $true } | ConvertTo-Json -Compress
