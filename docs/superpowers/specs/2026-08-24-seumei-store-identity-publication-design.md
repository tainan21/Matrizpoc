# Seumei Store Identity and Publication Design

Date: 2026-08-24

## Decision

Assimilate store identity as an app-local, preset-driven publication workflow. An OWNER or ADMIN edits a persistent tenant-scoped draft, previews that exact draft privately and explicitly publishes an immutable snapshot to the existing public store route.

This slice is not a page builder. It offers a small set of accessible visual systems and a stable content model. Arbitrary CSS, arbitrary fonts, draggable blocks, custom domains and asset upload remain outside the slice.

## Evidence

The external reference preserves valuable product intent:

- a catalog of visual presets;
- preview isolated from the active storefront until explicit application;
- token-driven surfaces instead of one-off component styling;
- a store-specific theme registry and responsive preview;
- a distinction between built-in and saved themes.

Its implementation is not reusable because the active design repository is browser-local, accepts a large arbitrary token surface, duplicates app theme concerns, has incomplete server persistence and documents server adapters as future work. The canonical Seumei already owns a persisted `StorePublication`, public slug resolution, catalog, checkout and two demo brands.

## User outcome

An authorized owner or administrator can:

1. open `/workspace/store/design` and resume the persisted draft;
2. choose one of three curated store presets and edit the public headline, announcement and description;
3. preview the exact draft at `/workspace/store/preview` without changing the public store;
4. publish with an expected version, producing an immutable publication snapshot;
5. refresh the public `/store/[storeSlug]` and see the new identity;
6. unpublish the store, causing the public route and checkout to become unavailable without deleting the draft;
7. resume editing and republish a later version.

Members and viewers do not receive design read access. Cross-tenant draft or publication identifiers never resolve.

## Presets

The first stable registry contains three store-specific presets:

- `COSMIC_DINER`: deep ink, electric mint and editorial display type for Galaxia Burger;
- `BRAZILIAN_WARMTH`: warm paper, ember red and serif accents for Sabor & Brasa;
- `MARKET_FRESH`: bright canvas, forest green and compact product density for general food retail.

The registry is app-local and code-owned. Each preset exposes only semantic tokens required by the storefront: background, foreground, surface, muted, accent, accent foreground, border, display family and radius. Every pair must meet WCAG AA for normal text. Stored data contains the preset ID, never arbitrary CSS.

## Aggregate and persistence

`StorePublication` remains the one-per-tenant aggregate and current public pointer. It gains persistent draft fields:

- `draftPreset`, `draftHeadline`, `draftAnnouncement`, `draftDescription` and optional `draftHeroImageUrl`;
- `draftVersion`, incremented by optimistic draft writes;
- `publishedVersionId`, optional pointer to the immutable current snapshot.

`StorePublicationVersion` stores an immutable snapshot:

- `id`, `tenantId`, `publicationId`, monotonically increasing `version`;
- `storeSlug`, `displayName`, `preset`, `headline`, `announcement`, `description`, optional hero image;
- publishing actor and timestamp.

The existing current public columns stay during compatibility. A publish transaction creates the snapshot, copies its public identity to the compatibility columns, points `publishedVersionId`, sets `isPublished` and increments the aggregate version. Unpublish clears only public visibility/pointer and increments the aggregate version. Existing rows receive a safe draft from current published content; no public storefront becomes unavailable during migration.

## Authorization and tenancy

Add `store.design.read`, `store.design.manage` and `store.publish` capabilities to OWNER and ADMIN only. Private pages resolve actor, company and membership server-side. Repository methods require tenant and company scope; public reads continue deriving tenant only from a published slug.

The browser submits draft values and `expectedVersion`, never tenant authority. Snapshot reads include tenant scope. Public cache keys, if introduced later, must include publication version; this slice keeps public reads uncached.

## Application boundaries

- `src/domain/store-identity.ts`: preset registry, content validation and publication rules;
- `src/domain/repositories/store-design-repository.ts`: tenant-scoped draft/publication contract;
- `src/application/store-design-service.ts`: capability enforcement and use cases;
- `src/infrastructure/store-design.repository.ts`: Prisma implementation and optimistic transactions;
- `src/http/store-design-handlers.ts`: validation/error mapping;
- `src/ui/presenters/store-design.presenter.ts`: editor, preview and public view models;
- `src/ui/StoreDesignStudio.tsx`: app-local editor;
- `src/ui/Storefront.tsx`: renders semantic preset tokens from the presenter.

No store domain moves to a package. Existing commerce checkout continues consuming the public publication contract and never reads draft data.

## Routes

- `GET/PATCH /api/store/design`: read or save draft;
- `POST /api/store/design/publish`: publish expected draft version;
- `POST /api/store/design/unpublish`: remove public visibility without deleting data;
- `GET /workspace/store/design`: persistent editor;
- `GET /workspace/store/preview`: private draft preview;
- `GET /store/[storeSlug]`: current immutable public snapshot.

The workspace shell exposes “Loja” only to roles with `store.design.read`.

## Honest states

- database unavailable remains explicit;
- missing publication creates a deterministic first draft from company identity;
- saving and publishing show real pending states without artificial delay;
- stale version returns conflict and asks for refresh;
- preview is visibly labeled “Rascunho privado”;
- public route returns not found when unpublished;
- invalid preset/content never falls back silently;
- editor works by keyboard and mobile has no horizontal overflow.

## Testing

TDD covers preset/content rules, capability matrix, draft initialization, optimistic save, snapshot publication, unpublish, public draft invisibility, checkout after publish, tenant A/B known IDs, presenter token safety, routes and UI states. Browser validation covers both demo brands, save → preview → publish → public refresh, unpublish/recover, restricted role, desktop/mobile, focus, console and overflow.

## Non-goals

- free-form CSS or JSON import;
- arbitrary Google font loading;
- block/page builder;
- image upload or media library;
- custom domain, SEO editor or analytics;
- scheduled publication or approval workflow;
- draft collaboration and field-level merge;
- extraction into MatrizLib.
