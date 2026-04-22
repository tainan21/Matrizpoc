# Spot — Agent Start Here

## 30-second overview
Spot owns the domain of bands, artists, gigs and gig bookings. Emits
`spot.gig.created`. Consumes `contracts.contract.created`. Integrates with
the Contracts app via `src/integration/gateways/contracts.gateway.ts`.

## Where to look (in this order)
1. `src/manifest/manifest.ts` — authoritative manifest (L2).
2. `src/bootstrap/index.ts` — runtime entry (L11).
3. `public-contract.ts` — manifest-only barrel (L2/L3).
4. `src/domain/` — entities + repository interfaces (L5).
5. `src/mock/` — seeds + repository implementations.
6. `src/ui/presenters/` — view models (L6).
7. `src/integration/` — adapters, gateways for external apps.
8. `app/` — Next.js routes.

## Relevant packages
`@matriz/integration-*`, `@matriz/platform-storage`, `@matriz/platform-telemetry`, `@matriz/flows-onboarding`, `@matriz/design-*`.

## Rules
- Do NOT import from other `apps/<x>/src/**` — use contracts + gateways (L3).
- UI must tipar em ViewModel, não em entity (L6).
