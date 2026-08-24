# Task 6 report — governance, lifecycle, and ecosystem verification

## Scope

Created the requested governance and migration documents. Local
`@matriz/design-system` and `@matriz/design-ui` are canonical; the external
library and Design Alpha are reference-only until separately approved portable
adoption. Documentation defines code/metadata/story authorities, app-local and
shared rules, import boundaries, lifecycle, WCAG review, story requirements,
public migration, and `fix-now`, `migrate-later`, `retain`, `deprecate`, and
`remove` debt classes.

## GREEN validation

- `pnpm --filter @matriz/design-system lint` — exit 0.
- `pnpm --filter @matriz/design-system typecheck` — exit 0.
- `pnpm --filter @matriz/design-system test` — exit 0; 2 files, 9 tests.
- `pnpm --filter @matriz/design-ui lint` — exit 0.
- `pnpm --filter @matriz/design-ui typecheck` — exit 0.
- `pnpm --filter @matriz/design-ui test` — exit 0; 3 files, 11 tests.
- `pnpm --filter @matriz/design-ui build-storybook` — exit 0, with existing
  client-directive/source-map and chunk-size warnings.
- `pnpm test:smoke` — exit 0; 23 files, 144 tests.
- `pnpm lint` — exit 0; 34 Turbo tasks.
- `pnpm typecheck` — fresh run completed; confirmation run exit 0 with 34
  cached tasks.

## Global build limitation

`pnpm build` has no reliable terminal exit in this shared dirty worktree. Its
first collector remained live after child builds ended. A second overlapping
collector reported `Another next build process is already running` for Hub and
SeuMei. All collectors and their `next build` children were terminated before
commit to avoid an indefinite lock. This is unverified, not GREEN.

## Playwright visual/accessibility inspection

No screenshot, trace, build output, or Playwright artifact is included.

### Storybook blocker

Reproduction: serve `packages/design/ui/storybook-static` at
`http://127.0.0.1:6006`; run `playwright-cli -s=task6 open
http://127.0.0.1:6006`, then `snapshot`. Storybook follows to
`http://127.0.0.1:6006/?path=/docs/matrizlib-overview--docs`, where the iframe
renders `React is not defined` instead of Overview. Console showed three errors;
the stack starts:

```text
ReferenceError: React is not defined
at vG (http://127.0.0.1:6006/assets/iframe-BLX3fvlr.js:1936:17300)
at _c (http://127.0.0.1:6006/assets/react-18-B3UXR-Kt.js:24:47822)
```

Storybook focus, Escape, reduced motion, long-content, error, and light/dark
inspection are therefore unverified despite successful static build.

### SeuMei

`http://127.0.0.1:3002/owners` remained at `Carregando Seumei…` on desktop and
mobile. Console repeatedly reported HMR WebSocket handshake failure:
`ws://127.0.0.1:3002/_next/webpack-hmr... net::ERR_INVALID_HTTP_RESPONSE`.
Owners content, keyboard/focus, Escape, reduced motion, error/long content, and
light/dark checks are unverified.

### Workbench

At `http://127.0.0.1:3005/settings`, unlock with documented development token
`1234` enabled inspection. Desktop and `390x844` snapshots exposed MatrizLib
compatibility, v0.1.0, 12 semantic tokens, and four local aliases. Selecting
Aurora applied `aria-pressed`; Tab moved focus to the next preset. The light/dark
toggle changed its accessible label from `Ativar tema claro` to `Ativar tema
escuro`. On mobile, opening the menu then pressing Escape closed it and returned
focus to `Abrir menu`.

Workbench `/` had an unrelated error-boundary state from missing
`apps/contracts/.matriz/agents`; Settings remained usable. Reduced-motion
computed behavior and manual contrast/long-content/error review are unverified.
The CLI reduced-motion attempt returned `SyntaxError: Unexpected identifier
'page'`.

## Boundary and artifact check

`git diff --check` was clean. Task package documentation was inspected: no
design package source imports app internals, integration, flows, access, storage,
HTTP, or product-domain types. Existing dirty and build-induced files, including
`next-env.d.ts`, are not staged. No `.env`, logs, build output, cache, or
screenshots are in the task commit.

## Post-Task-6 blocker fix — Storybook JSX runtime

### Root cause and RED evidence

Hypothesis: Storybook Vite was not configured for React's automatic JSX runtime.
The app sources intentionally omit default `React` imports, so the classic
transform emitted unresolved global `React.createElement` calls.

- Reproduced from the static catalog at `http://127.0.0.1:6006` with
  Playwright: Overview's iframe displayed `React is not defined` and logged
  three console errors.
- The former static output contained 113 `React.createElement` occurrences in
  the iframe, catalog component, and story chunks.
- New config-contract test initially failed with
  `expected undefined to be type of 'function'` because `viteFinal` was absent.
- New static-artifact gate initially failed, listing the affected chunks.

### Fix and regression gates

- Added a package-local `viteFinal` configuration that sets Vite esbuild's JSX
  transform to `automatic` without changing component sources or the dirty
  `theme-controller.tsx`.
- Added `storybook-jsx-runtime.test.ts`, which calls the real Storybook config
  and requires `esbuild.jsx === "automatic"`.
- Added `check-storybook-runtime.mjs`; `build-storybook` now fails when emitted
  static JavaScript contains a bare `React.createElement` call.

### GREEN evidence

- `pnpm --filter @matriz/design-ui lint` — exit 0.
- `pnpm --filter @matriz/design-ui typecheck` — exit 0; MDX validation covered
  foundations, migration, and overview.
- `pnpm --filter @matriz/design-ui test` — exit 0; 4 files / 12 tests passed.
- `pnpm --filter @matriz/design-ui build-storybook` — exit 0; the static
  runtime gate passed after the build.
- Playwright against served `storybook-static` rendered Overview correctly with
  0 console errors; Button rendered, accepted a real click, and remained usable
  after switching to dark; InfoHint rendered at mobile 390×844, opened its
  tooltip on click, and closed it with Escape while returning focus to the
  trigger. The console retained one Storybook 11 forward-compatibility warning:
  `PopoverProvider` will require `ariaLabel`; it is external to this fix.

Build still reports the existing ignored `"use client"` directive/source-map
warnings and the Vite chunk-size warning. They do not prevent static execution;
no build artifacts or browser logs are committed.

Commit: `5a77d9c fix(matrizlib): enforce Storybook automatic JSX runtime`.

## Storybook runtime gate hardening

The release-gate follow-up expands package lint to cover `scripts` and expands
static output selection to `.js` and `.mjs`. A unit-level gate proves that both
extensions are selected while non-JavaScript assets are ignored.

`React.createElement` remains a deliberate text check rather than an AST or
runtime-global analysis. For generated Storybook output, this package's policy
is stricter and simpler: classic JSX output is forbidden anywhere, because the
sources intentionally omit default `React` imports and require the automatic
runtime. Rejecting a bound `React.createElement` occurrence is therefore an
acceptable false positive that signals a policy violation; accepting classic
output would reintroduce the proven runtime blocker.

Fresh validation: lint, typecheck, 5 test files / 14 tests, and build-storybook
with the `.js`/`.mjs` artifact gate all passed. Existing source-map/client
directive and chunk-size warnings remain non-blocking and unchanged.

## Review follow-up

The sole Minor from Task 6 review is resolved. Both design-package instructions
now give an explicit accepted and rejected contribution example without changing
package responsibility, imports, runtime behavior, or public contracts. This
docs-only round requires Markdown/diff validation; no runtime tests were rerun.
