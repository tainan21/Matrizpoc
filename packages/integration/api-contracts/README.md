# @matriz/integration-api-contracts

## Responsibility (L9)
Versioned public DTOs and Zod schemas between apps. Governed by **L7**.

## Versions
- `src/v1/` — current default. Exported both from the root barrel and from `@matriz/integration-api-contracts/v1`.
- Future `src/v2/` will live side-by-side when a breaking change is needed.

## Exposes
- All DTOs and their Zod schemas for manifests, registry, external links, onboarding payloads, app navigation, contract inputs/outputs, gig/establishment/contract summaries, telemetry events.

## Must NOT
- Import from apps (L4).
- Hold business rules (L12).
