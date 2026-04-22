# WillDash — Agent Start Here

## 30-second overview
WillDash tracks goals, rewards and activity. Consumes the shared onboarding
and the base telemetry helper. Proves ecosystem extensibility.

## Where to look
1. `src/manifest/manifest.ts`, 2. `src/bootstrap/index.ts`,
3. `public-contract.ts`, 4. `src/domain/`, 5. `src/mock/`,
6. `src/ui/presenters/` (L6), 7. `app/`.

## Rules
- Same as other apps: no cross-app internals imports (L3).
