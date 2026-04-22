# Contracts — Agent Start Here

## 30-second overview
Contracts generates legal/commercial contracts from context produced by
Spot (gigs) or Seumei (establishments). Emits `contract.created` and
`contract.linked`. Records cross-app references as ExternalLinks.

## Where to look
1. `src/manifest/manifest.ts`, 2. `src/bootstrap/index.ts`,
3. `public-contract.ts`, 4. `src/domain/` (contract aggregate + repo interfaces — L5),
5. `src/integration/mappers/`, 6. `src/ui/presenters/` (L6),
7. `src/api/` (mock API), 8. `app/`.

## Rules
- Never store native pointers to Gig.id or Establishment.id — use ExternalLink (L3).
