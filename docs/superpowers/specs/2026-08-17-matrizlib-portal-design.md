# MatrizLib Portal and Incremental Library Design

**Status:** approved in conversation on 17 August 2026.

## Purpose

Create `apps/matrizlib` as the official visual portal for the Matriz design
system while preserving the existing local packages as the runtime authority.
The portal explains the library, demonstrates stable exports, inventories 99
component candidates, previews the current themes, and provides a controlled
path for bringing useful work from `C:\Apps\matrizlibUI` into the monorepo.

The portal is a documentation and demonstration product. It does not become a
second source of truth for tokens, themes, or component implementations.

## Decisions

1. `@matriz/design-system` remains authoritative for tokens, themes, public CSS,
   and theme metadata.
2. `@matriz/design-ui` remains authoritative for reusable React components.
3. `apps/matrizlib` owns presentation, navigation, examples, migration notes,
   and catalog metadata that is meaningful only to this portal.
4. `C:\Apps\matrizlibUI` is a read-only migration reference, not a dependency,
   subtree, copied package graph, or public API authority.
5. The first release catalogs C001-C099. C100 `ThemeSwatches` is intentionally
   excluded because the user will provide the newer theme work separately.
6. A catalog entry may be `available`, `candidate`, `migrating`, or `planned`.
   Only `available` entries may claim a stable import path.
7. A candidate is promoted to a design package only after two real consumers,
   stable domain-free semantics, a small public API, accessibility coverage,
   metadata, and tests.

## Architecture

### Application boundary

`apps/matrizlib` is a Next.js application on port 3007. It follows the same
manifest, bootstrap, public-contract, ownership, and validation conventions as
the other Matriz applications. The application has no product domain and no
database. Catalog content is versioned TypeScript data.

The first routes are:

- `/` - editorial landing page, library overview, proof points, package map,
  current themes, migration philosophy, and primary calls to action;
- `/components` - searchable and filterable C001-C099 catalog;
- `/components/[slug]` - component intent, status, import path when available,
  consumers, accessibility expectations, states, preview, and migration path;
- `/themes` - existing theme and color-mode laboratory, explicitly designed to
  receive newer themes later without restructuring the page;
- `/architecture` - packages, ownership rules, hooks, scripts, promotion flow,
  external-reference policy, and repository conventions.

### Catalog model

The portal defines a typed `ComponentCatalogEntry` with stable identifiers:

```ts
type ComponentStage = "available" | "candidate" | "migrating" | "planned"

interface ComponentCatalogEntry {
  readonly id: `C${string}`
  readonly slug: string
  readonly name: string
  readonly category: "foundation" | "input" | "navigation" | "feedback" | "data" | "overlay" | "layout" | "shell"
  readonly stage: ComponentStage
  readonly intention: string
  readonly summary: string
  readonly consumers: readonly string[]
  readonly importPath?: string
  readonly source: "local-canonical" | "external-reference" | "audit-candidate"
  readonly accessibility: readonly string[]
  readonly states: readonly string[]
}
```

Exactly 99 entries are versioned. The list is derived from the audited
C001-C099 protocol, then reconciled against current `@matriz/design-ui` exports
and the external reference. A validation test rejects duplicate IDs/slugs,
missing descriptions, invalid stable import paths, and counts other than 99.

### Preview boundary

Stable local exports receive live previews. Candidates use an honest
documentation preview that explains intended anatomy and states without
pretending an unimplemented component is importable. Preview adapters remain
inside the portal; design packages never import from the application.

### Theme boundary

The theme laboratory reads `themeRegistry`, `appThemes`, and public conversion
helpers from `@matriz/design-system`. It supports light/dark mode, density, a
theme selector, and responsive preview width. It does not duplicate theme
values, persist commercial entitlement, or add a second registry. Newer themes
can later enter through the canonical package and appear automatically.

### Ecosystem integration

The new manifest identifies `matrizlib` as a public design/reference app. It
declares the five routes above and domain-free capabilities. The Hub registry
and smoke tests expand from seven to eight applications. No existing app is
required to import portal internals.

## Visual Design

**Visual thesis:** a luminous technical editorial laboratory where typography,
tokens, and real component states are the visual material.

The landing page uses a full-bleed first viewport. `MatrizLib` is the loudest
element, followed by a concise promise and direct links to components and
architecture. A dynamic specimen plane demonstrates spacing, type, focus,
surface, and action tokens without a generic dashboard-card mosaic.

The content sequence is:

1. full-bleed identity and promise;
2. one concrete proof section showing canonical packages and current exports;
3. a component-index section with search, categories, and stage distribution;
4. a theme laboratory preview;
5. migration and governance explanation;
6. final call to explore C001-C099.

Motion is restrained: staged hero entrance, a scroll-linked specimen shift,
and fast preview/filter transitions. Reduced-motion preferences disable all
nonessential animation. The application uses at most two typefaces and one
dominant accent per active theme.

## Interaction and Data Flow

Catalog data is imported on the server and filtered with a small client-side
search component. Query state may be reflected in URL search parameters, but
no backend API is required. Component detail pages resolve by slug and return a
real not-found state for unknown entries.

Theme selection applies canonical CSS variables to the portal preview root.
The user may change theme, mode, density, and viewport without changing global
Hub preferences. The laboratory state is session-local in the first release.

## Accessibility

- WCAG 2.2 AA is the baseline.
- Search, filters, theme controls, and viewport controls are keyboard operable.
- Visible focus is mandatory and uses canonical focus tokens.
- Stage and status never rely on color alone.
- Component previews expose accessible names and descriptions.
- Motion honors `prefers-reduced-motion`.
- Mobile tap targets are at least 44 by 44 CSS pixels.

## Testing

- Catalog tests prove exactly 99 unique C001-C099 entries and validate stages.
- Route/presenter tests prove search, category, stage, and slug resolution.
- DOM tests cover interactive catalog filters and theme controls.
- Manifest and registry smoke tests expand to include the eighth app.
- Scoped `lint`, `typecheck`, `test`, and `build` run for the new app.
- Global build, typecheck, lint, smoke, and Prisma validation run because the
  manifest registry and global application count change.
- Browser verification covers desktop and mobile landing, catalog, detail,
  themes, architecture, keyboard focus, unknown slug, and reduced motion.

## Error Handling

The portal has no required network dependency. Missing component slugs render
Next.js not-found. A catalog integrity error fails tests/build rather than
silently hiding entries. A theme key that is not compatible falls back through
the canonical design-system behavior. Preview failures remain isolated to the
selected specimen and do not remove catalog navigation.

## Migration from the External Reference

Migration is evidence-driven:

1. inventory an external component or hook without importing it;
2. compare it with the canonical local public surface;
3. classify it as retain-reference, candidate, migrate, superseded, or reject;
4. identify two real consumers and remove product semantics;
5. write behavior/accessibility tests against the desired API;
6. implement locally in the correct canonical package;
7. add metadata, story, migration guidance, and verified consumers;
8. never copy `.next`, `dist`, caches, lockfiles, global CSS, or deep aliases.

Product-specific shells and blocks remain application-local until their
composition is stable and genuinely shared. Generic hooks may enter a design or
foundation package only when their dependency boundary and consumers justify it.

## Delivery Boundary

The first delivery includes the portal, routes, manifest/bootstrap, 99-entry
catalog, current-theme laboratory, live previews for canonical components,
honest candidate previews, tests, ecosystem memory, documentation, and Git
integration. It does not bulk-port every external implementation, replace the
current theme registry, add publishing infrastructure, or promise all 99 entries
as stable exports.
