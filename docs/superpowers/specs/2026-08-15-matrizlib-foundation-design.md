# MatrizLib Foundation — Design

## Status

Approved on 2026-08-15. The local monorepo packages are the official source of truth. The previously audited external MatrizLib remains a read-only reference and possible future source of portable packages; it is not imported, copied, or treated as canonical in this release.

## Objective

Turn the existing `@matriz/design-system` and `@matriz/design-ui` packages into the first production-grade MatrizLib release: explicit design decisions, stable public entry points, accessible components, executable documentation, automated checks, and observable adoption across every current app.

This is an incremental foundation release, not a big-bang migration. Existing Hub Alpha and Workbench visual systems remain app-local where their semantics or runtime model are specific.

## Evidence from the repository

- Seven executable apps exist: Hub, Workbench, SeuMei, Spot, Contracts, WillDash, and Sites.
- Six apps already consume the shared design packages; Workbench declares `@matriz/design-system` but primarily uses its richer app-local theme runtime.
- Shared primitives have substantial usage: `Stack`, `Text`, `Card`, `Badge`, and `Button` are already used across real routes.
- Five apps import `packages/design/ui/src/utility-shim.css` through a private filesystem path.
- Hub Alpha, Workbench presets, and the shared design system form three partially overlapping token contracts.
- No Storybook, component catalog, automated accessibility catalog, visual-regression baseline, package changelog, or structured component metadata currently exists.
- Theme persistence differs intentionally: most apps use client-side local storage; Workbench uses cookies and server rendering.
- The worktree contains uncommitted capability-theme work. The release must preserve and integrate it without moving price, entitlement, purchase, or tenant policy into a design package.

## Architectural decision

MatrizLib is a product made from two existing packages rather than a new monolith:

1. `@matriz/design-system` owns pure visual data and contracts: primitive tokens, semantic tokens, theme descriptors, CSS-variable generation, and token metadata. It may not own entitlement, billing, tenant policy, remote fetching, or product-domain rules.
2. `@matriz/design-ui` owns domain-free React primitives, their public styles, component metadata, stories, accessibility behavior, and component tests.
3. `packages/flows/themes` owns theme selection policy, compatibility decisions, entitlement-aware behavior, and cross-app application flows.
4. Apps own product components, presenters, navigation, copy, domain states, persistence choices, and advanced app-specific composition.

No app imports another app's internals. No design package imports integration or flows. UI continues to receive ViewModels rather than domain entities.

## Public surfaces

The first release adds deliberate package entry points while retaining the current root barrels for compatibility:

- `@matriz/design-system`
- `@matriz/design-system/css`
- `@matriz/design-system/metadata`
- `@matriz/design-ui`
- `@matriz/design-ui/primitives`
- `@matriz/design-ui/styles.css`
- `@matriz/design-ui/metadata`

Consumers must stop importing `packages/**/src/**` directly. New internal files remain private unless added to the package export map.

## Token model

The token contract follows a conservative primitive → semantic → component model compatible with DTCG 2025.10 concepts.

- Primitive tokens express raw values: color ramps, spacing, sizes, radii, typography, borders, elevation, opacity, z-index, motion duration, and easing.
- Semantic tokens express intention: canvas, surface, text, border, action, focus, feedback, overlay, and operational state.
- Component tokens exist only where a component requires a stable override point that semantic tokens cannot express.

The TypeScript registry is authoritative for token names, values, aliases, descriptions, and status. Public CSS is a generated-equivalent checked by contract tests; this release does not add a build-time generator because packages are source-first and the current workspace has no package build pipeline.

All new CSS variables use the `--matriz-*` namespace. Compatibility aliases such as `--surface`, `--brand`, and `--border` remain during migration and are documented as compatibility surfaces.

## Themes and identity

Light and dark remain baseline modes. Product identity changes accent and approved semantic roles without forking components.

- Shared themes preserve component semantics and accessibility.
- Workbench keeps cookie-based SSR, ten local presets, density, chart, and advanced surface tokens.
- Hub Alpha keeps `--hub-*`, spatial layout, 3D capability, and its app-local manual.
- MatrizLib documents how these app-local layers alias shared semantic roles and where they deliberately diverge.
- Capability themes may override visual values, but commercial metadata and access decisions stay in `flows/themes` and Hub capability code.

High contrast is documented as a target state but is not claimed as shipped until an audited implementation exists.

## Component foundation

The first stable component set is based on proven use:

- Layout: `Stack`, `Inline`, `Container`, `Surface`.
- Typography: `Heading`, `Text`.
- Actions: `Button`.
- Forms: `Label`, `Input`, `FormField`.
- Status and feedback: `Badge`, `Alert`, `EmptyState`.
- Context: `InfoHint`, consolidated from real Hub and Workbench implementations only after keyboard, focus, touch, and Escape behavior are covered.

Existing components remain source-compatible where possible. New APIs avoid boolean-prop proliferation and expose semantic variants, sizes, native attributes, accessible names, and composition through children.

Product shells, Hub spatial scenes, OperationalPage, Workbench boards, inspectors, timelines, navigation models, and product-domain badges remain app-local.

## Documentation experience

Storybook becomes the executable component catalog inside `packages/design/ui`. It is an interface over the real packages, not a second source of truth.

The initial information architecture is:

- Overview and design principles
- Foundations: color, typography, spacing, radius, elevation, motion, focus, themes, density, and Design Alpha boundary
- Components with purpose, usage, non-usage, states, keyboard, accessibility, theming, tokens, API, status, and realistic examples
- Patterns and layouts represented only by real compositions
- Accessibility baseline
- Migration and contribution guidance
- Component lifecycle and changelog

Stories render production components and expose light/dark, relevant states, viewport, density where supported, and reduced-motion context. Metadata is defined once in TypeScript and is reusable by docs, search, and a future MCP surface.

## Adoption across apps

Every current app receives an explicit, low-risk adoption signal in this release:

- Hub, SeuMei, Spot, Contracts, and WillDash replace private filesystem CSS imports with the public `@matriz/design-ui/styles.css` entry point.
- Sites imports the public MatrizLib foundation required by its current shared controls.
- Workbench imports only the non-invasive public token contract and documents its aliases; its server-rendered theme runtime is not replaced.
- Each app root declares its MatrizLib contract/version for inspection without importing another app.
- SeuMei is the simple-interface validation consumer for form/action/focus behavior.
- Workbench is the dense-interface validation consumer for tokens, status, focus, and density compatibility.

This release does not rewrite all local CSS. It establishes a supported path and migrates one real, low-risk surface per validation consumer where the shared abstraction already fits.

## Accessibility

WCAG 2.2 AA is the engineering baseline where applicable.

- Interactive components support keyboard operation and visible focus.
- Pointer targets are at least 24×24 CSS pixels, with 44×44 preferred for primary touch actions.
- Status never relies on color alone.
- Error and helper text have explicit relationships to fields.
- Reduced motion removes non-essential transitions.
- Automated accessibility checks are a first line of defense; keyboard, zoom, screen-reader, and touch review remain explicit manual gates.

## Testing and validation

The release uses layered evidence:

- Token contract tests: public names, aliases, theme completeness, fallback, and contrast pairs.
- Component tests: native attributes, labeling, described-by relationships, status semantics, keyboard, and Escape behavior.
- Storybook build: executable documentation compiles against public exports.
- Story accessibility checks: violations configured to fail for stable component stories.
- Scoped package lint/typecheck/tests.
- Scoped lint/typecheck/build for SeuMei and Workbench.
- Build verification for all seven apps because public package exports and CSS imports affect the full ecosystem.
- Root smoke and boundary tests because package exports and cross-app infrastructure are shared surfaces.
- Visual inspection at desktop and mobile for the two validation consumers, with screenshots stored only when they are intentional versioned evidence.

## Versioning, metadata, and governance

- Package versions and exported version constants must agree.
- Components have `experimental`, `beta`, `stable`, or `deprecated` status.
- Metadata records name, description, category, status, source, accessibility notes, tags, related components, tokens, and deprecation replacement when applicable.
- `CHANGELOG.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, and package-local `AGENTS.md` define evolution and agent behavior.
- A component becomes stable only after public API, documentation, themes, responsive behavior, accessibility review, tests, and at least one real consumer are evidenced.
- New shared components require two real consumers unless they are foundational primitives with an independently stable semantic contract.

## Error handling and rollback

- Unknown theme keys fall back to `matriz-base` without throwing.
- Unsupported product/theme combinations fall back to the product baseline.
- Client theme failures do not make an app unusable.
- Existing root barrels and compatibility CSS variables remain during the first migration.
- Each app migration is independently reversible by restoring its public import or app-local composition; domain and application layers are untouched.

## Explicit exclusions

- Importing or copying the external MatrizLib repository.
- Adopting `@matriz/product-ui` as foundation.
- Extracting Hub 3D, Workbench boards, product navigation, or domain-specific status components.
- Moving SeuMei, Spot, Contracts, or WillDash domain rules into packages.
- Replacing Workbench SSR theming with the shared local-storage controller.
- Claiming high-contrast, screen-reader, visual-regression, or cross-browser coverage without executed evidence.
- Creating empty directories or placeholder components to satisfy a catalog.

## Completion criteria for this release

The release is complete only when:

1. public token and style entry points are used instead of private source paths;
2. the foundational components and metadata are documented and tested;
3. Storybook builds from the real package exports;
4. SeuMei and Workbench demonstrate the shared language without leaking domain;
5. every app declares and compiles against the official MatrizLib contract;
6. scoped and ecosystem-wide checks have fresh, recorded results;
7. remaining debt is explicitly classified as fix now, migrate later, retain deliberately, deprecate, or remove.
