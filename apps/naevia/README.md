# NAEVIA

Agent-oriented browser for focused human and coworking sessions.

## Local verification

```powershell
corepack pnpm --filter @matriz/app-naevia test
corepack pnpm --filter @matriz/app-naevia lint
corepack pnpm --filter @matriz/app-naevia typecheck
corepack pnpm --filter @matriz/app-naevia build
corepack pnpm --filter @matriz/app-naevia e2e
```

Remote pages are isolated by capsule and never receive the NAEVIA preload bridge.

`infrastructure.json` declares a desktop tool without a provisioned database,
cache, event broker or workspace filesystem requirement. Browser profiles remain
in Electron's app-local user-data directory; downloads use the native download
directory. These are not shared infrastructure roots. Workbench and Store are
optional panels: their availability must not prevent browsing.
