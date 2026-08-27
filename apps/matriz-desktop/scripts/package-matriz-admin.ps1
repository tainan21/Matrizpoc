$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$installer = [IO.Path]::GetFullPath((Join-Path $workspaceRoot 'apps\matriz-admin\desktop\src-tauri\target\release\bundle\nsis\Matriz Admin_0.1.0_x64-setup.exe'))
$allowedRoot = $workspaceRoot.TrimEnd('\') + '\'

if (-not $installer.StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Unsafe Matriz Admin installer path'
}

& corepack pnpm --filter '@matriz/app-matriz-admin' package:desktop
if ($LASTEXITCODE -ne 0) {
  throw "Matriz Admin package failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) {
  throw 'Matriz Admin package did not produce the canonical installer'
}

$hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath ($installer + '.sha256') -Value $hash -Encoding ascii -NoNewline
Write-Output "MATRIZ_ADMIN_INSTALLER_SHA256=$hash"
