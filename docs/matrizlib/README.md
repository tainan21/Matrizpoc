# MatrizLib local

`apps/matrizlib` is the eighth Matriz application and the public reference
portal for the local design contracts. It runs on `http://localhost:3007` and
publishes six route families: `/`, `/components`, `/components/[slug]`,
`/themes`, `/sounds`, and `/architecture`.

The canonical MatrizLib in this monorepo is `@matriz/design-system` (tokens,
CSS, and metadata) plus `@matriz/design-ui` (React primitives, sounds, and Storybook).
The external library is reference-only: it is not a dependency, runtime source,
or API authority until a separate portable adoption is approved.

## Authorities

| Concern | Authority |
| --- | --- |
| Token values, names, themes, CSS | code and `@matriz/design-system/css` |
| Token/component description | public `./metadata` subpaths |
| Primitive behavior | code published by `@matriz/design-ui` |
| Sound IDs, metadata, packs, preferences and playback | `@matriz/design-ui/sounds` |
| Demonstrable scenarios | `@matriz/design-ui` stories |
| Domain decision, copy, state | owning app |

Metadata and stories make a contract observable; they do not create alternate
values or APIs. See [MIGRATION.md](MIGRATION.md) for consumer guidance and
[DESIGN-ALPHA.md](DESIGN-ALPHA.md) for reference limits.

## Catalog scope

The first portal release documents exactly C001-C099. Fourteen entries have a
current canonical metadata contract and are shown as `available`; the other 85
remain visible as `candidate`. A candidate name is evidence for a backlog, not
an import path. C100 ThemeSwatches is intentionally outside this release.

The portal owns descriptions, navigation, filtering, specimens, and migration
guidance. It does not own package exports, product behavior, persistence, Hub
entitlements, or theme values. `C:\Apps\matrizlibUI` remains a reference-only
source and is never a runtime dependency, alias, or copy source.

## Three product-language pillars

Components, Themes, and Sounds are equal first-class areas. The sound contract
contains 12 typed semantic events and one complete `Matriz Default` pack. Its
real WAV assets are intentionally compact starter cues: replace a pack's asset
map to evolve the sound design without changing consumer calls such as
`sound.play("notification")`.

The `/sounds` portal route owns only presentation, filtering, and preview. The
shared package owns registry validation, one-active-preview playback, versioned
preferences, volume, mute, enable/disable, startup activation handling, and
non-blocking shutdown feedback. Products must not instantiate `Audio` directly.

## Local validation

```bash
pnpm --filter @matriz/app-matrizlib test
pnpm --filter @matriz/app-matrizlib lint
pnpm --filter @matriz/app-matrizlib typecheck
pnpm --filter @matriz/app-matrizlib build
pnpm --filter @matriz/app-matrizlib dev
```

Browser evidence and the reproducible viewport/accessibility checks are kept in
`apps/matrizlib/docs/VERIFICATION.md`. Screenshots live under ignored
`output/matrizlib-verification/` and are not versioned. `next-env.d.ts` is the
official Next.js generated type declaration and is versioned; `.next/` remains
an ignored cache.

## App-local versus shared

A need remains local when it serves one app, carries product entity/rules, or
depends on auth, route, storage, integration, or persisted theme. It enters
`design/*` only with two real consumers, stable visual semantics, no domain,
and real maintenance reduction. UI consumes view models; design packages never
fetch, persist, or transform entities.

## Debt taxonomy

| Class | Meaning and action |
| --- | --- |
| `fix-now` | Breaks a boundary, security, or basic accessibility; fix before promotion. |
| `migrate-later` | A public replacement exists; consumers migrate in a planned step. |
| `retain` | Compatibility is still needed; keep and audit consumers. |
| `deprecate` | Communicate replacement, version/date, and migration path; do not remove yet. |
| `remove` | Remove only after an inventory and verified migration. |

Known debt: legacy CSS aliases are `retain` while consumers exist; they become
`deprecate` with a schedule and `remove` only after audit. The external library
is `retain` as a reference, never as an import shortcut.
