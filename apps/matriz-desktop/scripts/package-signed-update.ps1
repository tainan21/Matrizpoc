$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($env:TAURI_SIGNING_PRIVATE_KEY)) {
  throw 'TAURI_SIGNING_PRIVATE_KEY is required to produce signed updater artifacts'
}
if ([string]::IsNullOrWhiteSpace($env:MATRIZ_CONTROL_UPDATER_ENDPOINT)) {
  throw 'MATRIZ_CONTROL_UPDATER_ENDPOINT is required for a release build'
}
if ([string]::IsNullOrWhiteSpace($env:MATRIZ_CONTROL_UPDATER_PUBLIC_KEY)) {
  throw 'MATRIZ_CONTROL_UPDATER_PUBLIC_KEY is required for a release build'
}
if ([string]::IsNullOrWhiteSpace($env:WINDOWS_CERTIFICATE)) {
  throw 'WINDOWS_CERTIFICATE is required for a signed release build'
}
if ([string]::IsNullOrWhiteSpace($env:WINDOWS_CERTIFICATE_PASSWORD)) {
  throw 'WINDOWS_CERTIFICATE_PASSWORD is required for a signed release build'
}

$certificatePath = Join-Path $env:RUNNER_TEMP 'matriz-control-signing.pfx'
[IO.File]::WriteAllBytes($certificatePath, [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE))
$password = ConvertTo-SecureString $env:WINDOWS_CERTIFICATE_PASSWORD -AsPlainText -Force
$certificate = Import-PfxCertificate -FilePath $certificatePath -CertStoreLocation Cert:\CurrentUser\My -Password $password
if (-not $certificate.Thumbprint) {
  throw 'Windows signing certificate could not be imported'
}
$signingConfigPath = Join-Path $env:RUNNER_TEMP 'matriz-control-signing.json'
@{
  bundle = @{
    windows = @{
      certificateThumbprint = $certificate.Thumbprint
      digestAlgorithm = 'sha256'
      timestampUrl = 'http://timestamp.digicert.com'
    }
  }
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $signingConfigPath -Encoding UTF8

& corepack pnpm exec tauri build --bundles nsis --config src-tauri/tauri.release.conf.json --config $signingConfigPath
if ($LASTEXITCODE -ne 0) {
  throw "Signed Matriz Control package failed with exit code $LASTEXITCODE"
}
