$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$installer = [IO.Path]::GetFullPath((Join-Path $workspaceRoot 'apps\matriz-desktop\src-tauri\target\release\bundle\nsis\Matriz Control_1.0.0_x64-setup.exe'))
$allowedRoot = $workspaceRoot.TrimEnd('\') + '\'

if (-not $installer.StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Unsafe Matriz Control installer path'
}

& corepack pnpm --filter '@matriz/app-matriz-desktop' package:binary
if ($LASTEXITCODE -ne 0) {
  throw "Matriz Control package failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) {
  throw 'Matriz Control package did not produce the canonical installer'
}

$hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath ($installer + '.sha256') -Value $hash -Encoding ascii -NoNewline
Write-Output "MATRIZ_CONTROL_INSTALLER_SHA256=$hash"
