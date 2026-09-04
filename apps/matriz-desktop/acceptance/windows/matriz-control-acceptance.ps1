param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Inspect', 'Cleanup', 'Package', 'Installed')]
  [string]$Mode,

  [string]$OutputRoot,

  [string]$InstalledRoot,

  [string]$RunId = $(if ([string]::IsNullOrWhiteSpace($env:MATRIZ_ACCEPTANCE_RUN_ID)) { 'acceptance-' + [DateTimeOffset]::UtcNow.ToString('yyyyMMdd-HHmmss') } else { $env:MATRIZ_ACCEPTANCE_RUN_ID }),

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

$defaultInstalledRoot = Join-Path $env:LOCALAPPDATA 'Matriz Control'
if ([string]::IsNullOrWhiteSpace($InstalledRoot)) {
  $InstalledRoot = $defaultInstalledRoot
}
$resolvedInstalledRoot = [IO.Path]::GetFullPath($InstalledRoot)
$desktopPackage = Get-Content -LiteralPath (Join-Path $workspaceRoot 'apps\matriz-desktop\package.json') -Raw | ConvertFrom-Json
$expectedInstallerName = 'Matriz Control_{0}_x64-setup.exe' -f $desktopPackage.version
$expectedInstaller = [IO.Path]::GetFullPath((Join-Path $workspaceRoot (Join-Path 'apps\matriz-desktop\src-tauri\target\release\bundle\nsis' $expectedInstallerName)))

if ($Mode -eq 'Package' -or $Mode -eq 'Installed') {
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
  if ($PlanOnly) {
    [PSCustomObject]$plan | ConvertTo-Json -Depth 6 -Compress
    exit 0
  }

  if ($Mode -eq 'Package') {
    & corepack pnpm --filter '@matriz/app-matriz-desktop' package
    if ($LASTEXITCODE -ne 0) { throw "Package failed with exit code $LASTEXITCODE" }
    exit 0
  }

  $standardRoot = [IO.Path]::GetFullPath($defaultInstalledRoot)
  $acceptanceInstallRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'Matriz Control Acceptance'))
  $acceptanceInstallPrefix = $acceptanceInstallRoot.TrimEnd('\') + '\'
  if ($resolvedInstalledRoot -ne $standardRoot -and -not $resolvedInstalledRoot.StartsWith($acceptanceInstallPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Unsafe Matriz Control installation path'
  }

  $hashPath = $expectedInstaller + '.sha256'
  if (-not (Test-Path -LiteralPath $expectedInstaller -PathType Leaf) -or -not (Test-Path -LiteralPath $hashPath -PathType Leaf)) {
    throw 'Trusted Matriz Control installer is unavailable; run package first'
  }
  $expectedHash = (Get-Content -Raw -LiteralPath $hashPath).Trim()
  $actualHash = (Get-FileHash -LiteralPath $expectedInstaller -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($expectedHash -notmatch '^[a-fA-F0-9]{64}$' -or $actualHash -ne $expectedHash.ToLowerInvariant()) {
    throw 'Matriz Control installer failed integrity verification'
  }

  $runOutput = Join-Path $resolvedOutputRoot $RunId
  New-Item -ItemType Directory -Force -Path $runOutput | Out-Null
  $productExecutable = Join-Path $resolvedInstalledRoot 'matriz-control.exe'
  $productUninstaller = Join-Path $resolvedInstalledRoot 'uninstall.exe'
  $uninstallDeadlineSeconds = 120

  function Stop-ExactControlProcesses {
    $target = $productExecutable.ToLowerInvariant()
    $processes = @(Get-CimInstance Win32_Process -Filter "Name = 'matriz-control.exe'" | Where-Object {
      -not [string]::IsNullOrWhiteSpace($_.ExecutablePath) -and $_.ExecutablePath.ToLowerInvariant() -eq $target
    })
    foreach ($item in $processes) {
      Stop-Process -Id $item.ProcessId -Force -ErrorAction Stop
    }
  }

  function Invoke-ExistingUninstaller {
    Stop-ExactControlProcesses
    if (Test-Path -LiteralPath $productUninstaller -PathType Leaf) {
      $uninstall = Start-Process -FilePath $productUninstaller -ArgumentList '/S' -Wait -PassThru
      if ($uninstall.ExitCode -ne 0) { throw "Uninstall failed with exit code $($uninstall.ExitCode)" }
      $deadline = [DateTime]::UtcNow.AddSeconds($uninstallDeadlineSeconds)
      while ((Test-Path -LiteralPath $productExecutable -PathType Leaf) -and [DateTime]::UtcNow -lt $deadline) {
        Start-Sleep -Milliseconds 250
      }
      if (Test-Path -LiteralPath $productExecutable -PathType Leaf) { throw 'Uninstall left the product executable behind' }
    }
    elseif (Test-Path -LiteralPath $productExecutable -PathType Leaf) {
      throw 'Existing Matriz Control installation has no canonical uninstaller'
    }
  }

  $acceptanceStarted = [DateTimeOffset]::UtcNow
  $completed = $false
  try {
    Invoke-ExistingUninstaller
    $install = Start-Process -FilePath $expectedInstaller -ArgumentList @('/S', "/D=$resolvedInstalledRoot") -Wait -PassThru
    if ($install.ExitCode -ne 0) { throw "Install failed with exit code $($install.ExitCode)" }
    if (-not (Test-Path -LiteralPath $productExecutable -PathType Leaf) -or -not (Test-Path -LiteralPath $productUninstaller -PathType Leaf)) {
      throw 'Installer did not produce the canonical executable and uninstaller'
    }

    $binaryText = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($productExecutable))
    foreach ($marker in @('acceptance/e2e', '@wdio/tauri-service', 'tauri-driver')) {
      if ($binaryText.Contains($marker, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Production executable contains acceptance marker: $marker"
      }
    }

    $installed = Get-Item -LiteralPath $productExecutable
    [ordered]@{
      schemaVersion = 'v1'
      runId = $RunId
      mode = 'Installed'
      target = 'packaged-candidate'
      productName = $installed.VersionInfo.ProductName
      productVersion = $installed.VersionInfo.ProductVersion
      executablePath = $installed.FullName
      executableBytes = $installed.Length
      executableSha256 = (Get-FileHash -LiteralPath $productExecutable -Algorithm SHA256).Hash.ToLowerInvariant()
      installerPath = $expectedInstaller
      installerSha256 = $actualHash
      installedAt = [DateTimeOffset]::UtcNow.ToString('o')
    } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $runOutput 'installation.json') -Encoding utf8

    $previousBinary = $env:MATRIZ_CONTROL_BINARY
    $previousRunId = $env:MATRIZ_ACCEPTANCE_RUN_ID
    $env:MATRIZ_CONTROL_BINARY = $productExecutable
    $env:MATRIZ_ACCEPTANCE_RUN_ID = $RunId
    $previousEvidencePath = $env:MATRIZ_ACCEPTANCE_EVIDENCE_PATH
    $playwrightEvidence = Join-Path $runOutput 'playwright-evidence.json'
    $env:MATRIZ_ACCEPTANCE_EVIDENCE_PATH = $playwrightEvidence
    try {
      & corepack pnpm --filter '@matriz/app-matriz-desktop' e2e:run *>&1 | Tee-Object -FilePath (Join-Path $runOutput 'e2e.log')
      $e2eExit = $LASTEXITCODE
    }
    finally {
      $env:MATRIZ_CONTROL_BINARY = $previousBinary
      $env:MATRIZ_ACCEPTANCE_RUN_ID = $previousRunId
      $env:MATRIZ_ACCEPTANCE_EVIDENCE_PATH = $previousEvidencePath
    }
    if ($e2eExit -ne 0) { throw "Installed E2E failed with exit code $e2eExit" }

    $measured = Start-Process -FilePath $productExecutable -PassThru
    try {
      $windowDeadline = [DateTime]::UtcNow.AddSeconds(15)
      do { Start-Sleep -Milliseconds 100; $measured.Refresh() } while ($measured.MainWindowHandle -eq 0 -and [DateTime]::UtcNow -lt $windowDeadline)
      & (Join-Path $PSScriptRoot 'measure-process.ps1') -Pid $measured.Id -DurationSeconds 30 -OutputRoot $runOutput
      if ($LASTEXITCODE -ne 0) { throw "Performance measurement failed with exit code $LASTEXITCODE" }
    }
    finally {
      Stop-Process -Id $measured.Id -Force -ErrorAction SilentlyContinue
    }

    $commit = (& git -C $workspaceRoot rev-parse HEAD).Trim()
    $durationMs = [Math]::Round(([DateTimeOffset]::UtcNow - $acceptanceStarted).TotalMilliseconds)
    $resultRecorder = Join-Path $workspaceRoot 'apps\matriz-desktop\acceptance\record-installed-results.ts'
    & corepack pnpm exec tsx $resultRecorder --run-id $RunId --output-root $runOutput --commit $commit --artifact-sha256 $actualHash --duration-ms $durationMs --playwright-evidence $playwrightEvidence
    if ($LASTEXITCODE -ne 0) { throw "Result recording failed with exit code $LASTEXITCODE" }
    $completed = $true
  }
  finally {
    Stop-ExactControlProcesses
    Invoke-ExistingUninstaller
    if (Test-Path -LiteralPath $productExecutable -PathType Leaf) {
      throw 'Acceptance cleanup left the installed executable behind'
    }
  }

  $lifecycle = [PSCustomObject]@{
    schemaVersion = 'v1'
    runId = $RunId
    mode = 'Installed'
    target = 'packaged-candidate'
    status = if ($completed) { 'pass' } else { 'fail' }
    installerSha256 = $actualHash
    installedRoot = $resolvedInstalledRoot
    uninstalled = -not (Test-Path -LiteralPath $productExecutable -PathType Leaf)
  }
  $lifecycle | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $runOutput 'lifecycle.json') -Encoding utf8
  $lifecycle | ConvertTo-Json -Compress
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
