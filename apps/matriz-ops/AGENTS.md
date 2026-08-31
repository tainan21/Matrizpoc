# AGENTS.md — Matriz Ops

## Objective

Operate users, access, platform health, telemetry and wallet workflows through real Core, Hub and Pay data.

## Boundaries

- Keep operator policy, audit and presenters inside this app.
- Import Matriz Pay only through `@matriz/integration-wallet-contracts` and authenticated HTTP APIs.
- UI consumes Ops view models, never Prisma/domain entities.
- Every sensitive mutation requires reason, typed confirmation, recent session and OTP step-up.
- Never store ledger, provider credentials, access tokens or offline financial data in desktop storage.

## Validation

Distribution: `matriz-ops-tauri`, Windows `com.matriz.ops`, tag `ops-v*`. Read `../../docs/release-distribution.md` first.

- `corepack pnpm --filter @matriz/app-matriz-ops test`
- `corepack pnpm --filter @matriz/app-matriz-ops lint`
- `corepack pnpm --filter @matriz/app-matriz-ops typecheck`
- `corepack pnpm --filter @matriz/app-matriz-ops build`
