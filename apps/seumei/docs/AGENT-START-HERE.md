# Seumei — Agent Start Here

## 30-second overview
Seumei owns the domain of establishments (restaurants/venues/operations) and
their profiles. Emits `seumei.establishment.selected`. Integrates with
Contracts via `src/integration/gateways/contracts.gateway.ts`.

## Where to look
1. `src/manifest/manifest.ts`, 2. `src/bootstrap/index.ts`,
3. `public-contract.ts`, 4. `src/domain/` (entities + repo interfaces — L5),
5. `src/mock/` (seeds + repo impls), 6. `src/ui/presenters/` (L6),
7. `src/integration/`, 8. `app/`, 9. `desktop/` for the native delivery surface.

## Rules
- No cross-app internals imports (L3). Use `@matriz/integration-api-contracts` + gateway.
- `desktop/` may import Seumei-local application and presenter layers because it
  is the same app, but must not duplicate domain or depend on Next.js runtime.
