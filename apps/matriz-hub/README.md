# matriz-hub

Central entry app of the Matriz ecosystem.

## Ownership (L9)
- **Responsibility**: Hub landing, app catalog, registry explorer, event
  timeline, external-links explorer, onboarding status, feature-flags view.
- **Exposes**: `public-contract.ts` → `{ manifest }` only.
- **Does NOT expose**: Internals (`src/**`, `app/**`).
- **May import**: `@matriz/*` packages; `@apps/<app>/public-contract` (manifest only).
- **Must NOT import**: `apps/<app>/src/**` or `apps/<app>/app/**`.

See `docs/AGENT-START-HERE.md` for agents.
