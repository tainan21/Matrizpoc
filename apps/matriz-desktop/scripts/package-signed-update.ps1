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

& corepack pnpm exec tauri build --bundles nsis --config src-tauri/tauri.release.conf.json
if ($LASTEXITCODE -ne 0) {
  throw "Signed Matriz Control package failed with exit code $LASTEXITCODE"
}
