# spot

## Ownership (L9)
- **Responsibility**: domínio de bandas, artistas e gigs.
- **Exposes**: `public-contract.ts` → `{ manifest }` only.
- **Does NOT expose**: internals.
- **May import**: `@matriz/*` packages.
- **Must NOT import**: outros apps (cross-app só via contratos/gateways).
