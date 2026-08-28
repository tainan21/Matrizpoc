param(
  [Parameter(Mandatory = $true)][string]$ElectronExecutable,
  [Parameter(Mandatory = $true)][string]$TauriExecutable,
  [string]$Output = "benchmark-results.json"
)
$ErrorActionPreference = "Stop"

function Measure-Edition([string]$Name, [string]$Executable) {
  $resolved = (Resolve-Path $Executable).Path
  $samples = @()
  1..5 | ForEach-Object {
    $before = @(Get-Process | Where-Object { $_.Path -eq $resolved } | Select-Object -ExpandProperty Id)
    $timer = [Diagnostics.Stopwatch]::StartNew()
    $launched = Start-Process -FilePath $resolved -PassThru
    $deadline = (Get-Date).AddSeconds(30)
    do {
      Start-Sleep -Milliseconds 50
      $process = Get-Process | Where-Object { $_.Path -eq $resolved -and $_.Id -notin $before -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    } while (-not $process -and (Get-Date) -lt $deadline)
    if (-not $process) { $process = Get-Process -Id $launched.Id -ErrorAction SilentlyContinue }
    if (-not $process) { throw "$Name não expôs processo mensurável em 30 segundos" }
    $timer.Stop()
    Start-Sleep -Milliseconds 750
    $process.Refresh()
    $samples += [ordered]@{
      run = $_
      startupMs = $timer.ElapsedMilliseconds
      workingSetBytes = $process.WorkingSet64
      cpuSeconds = $process.TotalProcessorTime.TotalSeconds
    }
    Get-Process | Where-Object { $_.Path -eq $resolved -and $_.Id -notin $before } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 250
  }
  [ordered]@{ edition = $Name; executable = $resolved; samples = $samples }
}

$report = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  environment = [ordered]@{ os = [Environment]::OSVersion.VersionString; processor = $env:PROCESSOR_IDENTIFIER; logicalProcessors = [Environment]::ProcessorCount }
  methodology = "Cinco execuções; processo encerrado após captura. Ciclos destrutivos não são executados por este benchmark."
  editions = @((Measure-Edition "electron" $ElectronExecutable), (Measure-Edition "tauri" $TauriExecutable))
}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Output -Encoding utf8
Write-Output (Resolve-Path $Output).Path
