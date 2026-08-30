# MyHub (`matriz-hub`)

Central entry app of the Matriz ecosystem and home of small, local workspace
utilities exposed through `/praticies`.

## Ownership (L9)
- **Responsibility**: Hub landing, app catalog, registry explorer, event
  timeline, external-links explorer, onboarding status, feature-flags view and
  the app-local Praticies workbench.
- **Exposes**: `public-contract.ts` → `{ manifest }` only.
- **Does NOT expose**: Internals (`src/**`, `app/**`).
- **May import**: `@matriz/*` packages; `@apps/<app>/public-contract` (manifest only).
- **Must NOT import**: `apps/<app>/src/**` or `apps/<app>/app/**`.

See `docs/AGENT-START-HERE.md` for agents.

The architecture and guardrails for workspace utilities are documented in
`docs/PRACTICIES.md`. The Hub also owns the persistent Capability Platform
projections and exposes their versioned HTTP contract; theme definitions remain
CSS-first in `@matriz/design-system`.

The shared ecosystem cache endpoint is backed by the managed Garnet service at
`127.0.0.1:46379`. Hub keys are restricted to
`matriz:v1:matriz-hub:<tenant>:<namespace>:<key>`, always carry a TTL, and are
never an authorization or persistence authority. Credentials come only from
the Control vault.
Garnet 2.1.5 ACLs restrict credentials to the portable cache command set, but
do not support Redis key-pattern ACLs. Prefix isolation is therefore enforced
by this app-local adapter; cache must never hold authoritative identity,
authorization, or domain state.
