param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Inspect', 'Cleanup', 'Package', 'Installed')]
  [string]$Mode,

  [string]$OutputRoot,

  [string]$InstalledRoot = (Join-Path $env:LOCALAPPDATA 'Matriz Control'),

  [string]$RunId = ('acceptance-' + [DateTimeOffset]::UtcNow.ToString('yyyyMMdd-HHmmss')),

  [switch]$PlanOnly
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..'))
$allowedOutputRoot = [IO.Path]::GetFullPath((Join-Path $workspaceRoot 'output\matriz-control-acceptance'))
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = $allowedOutputRoot
}
$resolvedOutputRoot = [IO.Path]::GetFullPath($OutputRoot)
$allowedPrefix = $allowedOutputRoot.TrimEnd('\') + '\'

if (
  $resolvedOutputRoot -ne $allowedOutputRoot -and
  -not $resolvedOutputRoot.StartsWith($allowedPrefix, [StringComparison]::OrdinalIgnoreCase)
) {
  throw 'Unsafe acceptance output path'
}

if ($Mode -eq 'Cleanup') {
  if ($resolvedOutputRoot -eq $allowedOutputRoot) {
    throw 'Unsafe acceptance output path'
  }
  if (Test-Path -LiteralPath $resolvedOutputRoot) {
    Remove-Item -LiteralPath $resolvedOutputRoot -Recurse -Force
  }
  [PSCustomObject]@{
    schemaVersion = 'v1'
    mode = 'Cleanup'
    outputRoot = $resolvedOutputRoot
    removed = -not (Test-Path -LiteralPath $resolvedOutputRoot)
  } | ConvertTo-Json -Compress
  exit 0
}

$resolvedInstalledRoot = [IO.Path]::GetFullPath($InstalledRoot)
$expectedInstaller = [IO.Path]::GetFullPath((Join-Path $workspaceRoot 'apps\matriz-desktop\src-tauri\target\release\bundle\nsis\Matriz Control_0.1.0_x64-setup.exe'))

if ($Mode -eq 'Package' -or $Mode -eq 'Installed') {
  if (-not $PlanOnly) {
    throw "$Mode execution is disabled until installed lifecycle acceptance"
  }

  $plan = [ordered]@{
    schemaVersion = 'v1'
    runId = $RunId
    mode = $Mode
    planOnly = $true
    installerPath = $expectedInstaller
    productExecutable = (Join-Path $resolvedInstalledRoot 'matriz-control.exe')
    productUninstaller = (Join-Path $resolvedInstalledRoot 'uninstall.exe')
    actions = @()
  }
  if ($Mode -eq 'Package') {
    $plan.actions = @(
      [ordered]@{
        executable = 'pnpm.cmd'
        arguments = @('--filter', '@matriz/app-matriz-desktop', 'package')
        workingDirectory = $workspaceRoot
      }
    )
  }
  else {
    $plan.actions = @(
      [ordered]@{ executable = $expectedInstaller; arguments = @('/S', "/D=$resolvedInstalledRoot") },
      [ordered]@{ executable = (Join-Path $resolvedInstalledRoot 'matriz-control.exe'); arguments = @() },
      [ordered]@{ executable = (Join-Path $resolvedInstalledRoot 'uninstall.exe'); arguments = @('/S') }
    )
  }
  [PSCustomObject]$plan | ConvertTo-Json -Depth 6 -Compress
  exit 0
}

$executablePath = Join-Path $resolvedInstalledRoot 'matriz-control.exe'
if (-not (Test-Path -LiteralPath $executablePath -PathType Leaf)) {
  throw "Matriz Control executable not found at the inspected installation root"
}

$executable = Get-Item -LiteralPath $executablePath
$version = $executable.VersionInfo
$hash = Get-FileHash -LiteralPath $executablePath -Algorithm SHA256
$runOutput = Join-Path $resolvedOutputRoot $RunId
New-Item -ItemType Directory -Force -Path $runOutput | Out-Null

$metadata = [PSCustomObject]@{
  schemaVersion = 'v1'
  runId = $RunId
  mode = 'Inspect'
  target = 'installed-baseline'
  productName = $version.ProductName
  productVersion = $version.ProductVersion
  fileVersion = $version.FileVersion
  publisher = $version.CompanyName
  executablePath = $executable.FullName
  executableBytes = $executable.Length
  executableModifiedAt = $executable.LastWriteTimeUtc.ToString('o')
  artifactSha256 = $hash.Hash
  capturedAt = [DateTimeOffset]::UtcNow.ToString('o')
}

$metadataPath = Join-Path $runOutput 'installation.json'
$metadata | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $metadataPath -Encoding utf8
$metadata | ConvertTo-Json -Compress
