param(
  [Parameter(Mandatory = $true)]
  [Alias('Pid')]
  [ValidateRange(5, 2147483647)]
  [int]$ProcessId,

  [ValidateRange(1, 120)]
  [int]$DurationSeconds = 30,

  [string]$OutputRoot
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..'))
$allowedOutputRoot = [IO.Path]::GetFullPath((Join-Path $workspaceRoot 'output\matriz-control-acceptance'))
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $allowedOutputRoot 'current'
}
$resolvedOutputRoot = [IO.Path]::GetFullPath($OutputRoot)
$allowedPrefix = $allowedOutputRoot.TrimEnd('\') + '\'
if ($resolvedOutputRoot -ne $allowedOutputRoot -and -not $resolvedOutputRoot.StartsWith($allowedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Unsafe performance output path'
}

$process = Get-Process -Id $ProcessId -ErrorAction Stop
$executablePath = $process.Path
if ([string]::IsNullOrWhiteSpace($executablePath) -or [IO.Path]::GetFileName($executablePath) -ne 'matriz-control.exe') {
  throw "PID $ProcessId is not the Matriz Control executable"
}

New-Item -ItemType Directory -Force -Path $resolvedOutputRoot | Out-Null
$startedAt = $process.StartTime.ToUniversalTime()
$sampleStartedAt = [DateTimeOffset]::UtcNow
$startupToObservedInteractiveMsUpperBound = ($sampleStartedAt - $startedAt).TotalMilliseconds
$initialCpu = $process.TotalProcessorTime.TotalSeconds
$workingSets = [Collections.Generic.List[double]]::new()
$sampleCount = [Math]::Max(2, $DurationSeconds * 2)
for ($index = 0; $index -lt $sampleCount; $index++) {
  $process.Refresh()
  if ($process.HasExited) { throw "Matriz Control PID $ProcessId exited during measurement" }
  $workingSets.Add($process.WorkingSet64 / 1MB)
  Start-Sleep -Milliseconds 500
}
$process.Refresh()
$elapsedSeconds = ([DateTimeOffset]::UtcNow - $sampleStartedAt).TotalSeconds
$cpuSeconds = $process.TotalProcessorTime.TotalSeconds - $initialCpu
$logicalProcessors = [Math]::Max(1, [Environment]::ProcessorCount)
$averageCpuPercent = ($cpuSeconds / $elapsedSeconds / $logicalProcessors) * 100
$children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" | Select-Object -ExpandProperty ProcessId)

$identity = [ordered]@{
  schemaVersion = 'v1'
  pid = $ProcessId
  executablePath = $executablePath
  executableSha256 = (Get-FileHash -LiteralPath $executablePath -Algorithm SHA256).Hash
  startedAt = $startedAt.ToString('o')
}
$performance = [ordered]@{
  schemaVersion = 'v1'
  pid = $ProcessId
  durationSeconds = [Math]::Round($elapsedSeconds, 3)
  sampleCount = $workingSets.Count
  averageCpuPercent = [Math]::Round($averageCpuPercent, 4)
  averageWorkingSetMb = [Math]::Round(($workingSets | Measure-Object -Average).Average, 2)
  peakWorkingSetMb = [Math]::Round(($workingSets | Measure-Object -Maximum).Maximum, 2)
  startupToObservedInteractiveMsUpperBound = [Math]::Round($startupToObservedInteractiveMsUpperBound)
  childPids = $children
  capturedAt = [DateTimeOffset]::UtcNow.ToString('o')
}
$identity | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $resolvedOutputRoot 'process.json') -Encoding utf8
$performance | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $resolvedOutputRoot 'performance.json') -Encoding utf8
$performance | ConvertTo-Json -Compress
