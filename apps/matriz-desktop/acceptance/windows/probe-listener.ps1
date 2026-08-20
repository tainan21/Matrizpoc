param(
  [ValidateRange(0, 65535)]
  [int]$Port = 0
)

$ErrorActionPreference = 'Stop'
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)

try {
  $listener.Start()
  $endpoint = [Net.IPEndPoint]$listener.LocalEndpoint
  [PSCustomObject]@{
    schemaVersion = 'v1'
    ready = $true
    pid = $PID
    address = '127.0.0.1'
    port = $endpoint.Port
  } | ConvertTo-Json -Compress

  while ($true) {
    $control = [Console]::In.ReadLine()
    if ($null -eq $control -or $control.Trim() -eq 'stop') {
      break
    }
  }
}
finally {
  $listener.Stop()
}
