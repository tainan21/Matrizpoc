$ErrorActionPreference = 'Stop'
$appRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$package = Get-Content -LiteralPath (Join-Path $appRoot 'package.json') -Raw | ConvertFrom-Json

& corepack pnpm --dir $appRoot run package:binary
if ($LASTEXITCODE -ne 0) { throw "NAEVIA package failed with exit code $LASTEXITCODE" }

$installer = Join-Path $appRoot ("release\naevia-{0}-windows-x64-setup.exe" -f $package.version)
if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) { throw 'NAEVIA installer was not produced' }
$hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath ($installer + '.sha256') -Value $hash -NoNewline -Encoding ascii
Write-Output "NAEVIA_INSTALLER_SHA256=$hash"
