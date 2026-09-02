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
