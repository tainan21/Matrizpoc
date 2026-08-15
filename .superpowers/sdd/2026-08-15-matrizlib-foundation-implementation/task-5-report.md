# Task 5 report — real validation surfaces

## Scope

- SeuMei: owner presentation and the existing contract-request action only.
- Matriz Workbench: the existing theme-system picker and its app-local palette
  aliases only.
- Shared fix: the narrow React client boundary required for the existing
  `design-ui` form context to be safely re-exported to server-rendered apps.

No product domain moved to a shared package. Workbench remains token-only and
keeps its SSR cookie, ten presets, density values, and local composition.

## RED / GREEN

### RED

- `pnpm --filter @matriz/app-seumei test -- src/ui/presenters/owner.presenter.test.ts app/establishments/EstablishmentActions.contract.test.ts`
  failed before implementation: `owner.presenter` did not exist and the action
  lacked the accessible live-feedback contract.
- `pnpm --filter @matriz/app-matriz-workbench test -- src/ui/components/theme-system-picker.test.ts`
  failed before implementation because the picker did not consume public
  MatrizLib metadata.
- `pnpm --filter @matriz/app-matriz-workbench test -- src/ui/theme.test.ts`
  failed before the alias mapping because `--matriz-color-canvas` was undefined.
- `pnpm --filter @matriz/app-seumei build` consistently failed at
  `app/layout.tsx -> @matriz/design-ui/index.ts -> forms.tsx`: `createContext`
  was loaded through a React Server Component without a client boundary.

### GREEN

- SeuMei scoped tests: 2 files, 3 tests passed.
- Workbench scoped tests: 2 files, 10 tests passed.
- Full SeuMei tests: 2 files, 3 tests passed.
- Full Workbench tests: 49 files, 205 tests passed.
- `@matriz/design-ui` test: 3 files, 11 tests passed; lint and typecheck passed.
- SeuMei and Workbench lint, typecheck, and production builds passed with exit
  code 0 after the client-boundary correction.

## Files

- `apps/seumei/app/owners/page.tsx`
- `apps/seumei/src/ui/presenters/owner.presenter.ts`
- `apps/seumei/src/ui/presenters/owner.presenter.test.ts`
- `apps/seumei/app/establishments/EstablishmentActions.tsx`
- `apps/seumei/app/establishments/EstablishmentActions.contract.test.ts`
- `apps/seumei/vitest.config.ts`
- `apps/seumei/package.json`
- `apps/matriz-workbench/src/ui/components/theme-system-picker.tsx`
- `apps/matriz-workbench/src/ui/components/theme-system-picker.module.css`
- `apps/matriz-workbench/src/ui/components/theme-system-picker.test.ts`
- `apps/matriz-workbench/src/ui/theme-presets.ts`
- `apps/matriz-workbench/src/ui/theme.test.ts`
- `apps/matriz-workbench/docs/MATRIZLIB-ADOPTION.md`
- `packages/design/ui/src/forms.tsx`
- `pnpm-lock.yaml`

## Shared-boundary diagnosis

`forms.tsx` is the only `design-ui` barrel export that uses `createContext` and
`useContext` without `"use client"`. The existing client-boundary pattern is
already used by `theme-controller.tsx`, `ecosystem-bar.tsx`, and
`info-hint.tsx`. Adding the directive to `forms.tsx` fixes the source boundary
without changing the barrel, `theme-controller`, form behavior, or any domain
surface.

## Commit

`feat(matrizlib): validate simple and dense consumers`

## Concerns

- Vitest emits Vite's CJS Node API deprecation warning in both app test runs;
  checks pass and this task does not change the shared test toolchain.
- One Workbench full-suite run made in parallel with three other app checks
  timed out in a filesystem WIP-limit test. The isolated reproduction passed
  in 103ms and a fresh serial full run passed 49 files / 205 tests, so the
  evidence indicates resource contention rather than a product regression.
- The Workbench compatibility notice is deliberately compact status text, not a
  new design-system gallery or a `design-ui` adoption.

## Review fix round 1

The previous `EstablishmentActions` and `ThemeSystemPicker` tests inspected
TSX text. They were replaced with rendered Testing Library contracts running in
scoped jsdom environments.

### RED / GREEN

- RED: the new component tests initially could not resolve the scoped Testing
  Library dependencies, then failed with `document is not defined` under the
  existing Node test environments, and finally exposed the missing automatic
  JSX transform used by the apps.
- GREEN: each app now uses jsdom only for `*.test.tsx` and Vite's automatic JSX
  transform. The SeuMei test renders the real action with only its DI container
  mocked, clicks the real button, and validates the live status, message,
  decorative icon, and `aria-describedby` relation. The Workbench test renders
  the real picker, validates public metadata/token text, clicks Aurora, and
  observes the local system, semantic alias, and pressed state. A separate
  package-boundary assertion confirms Workbench remains token-only.

### Verification

- `pnpm --filter @matriz/app-seumei test` — 2 files / 3 tests passed.
- `pnpm --filter @matriz/app-matriz-workbench test` — 49 files / 206 tests
  passed.
- Both app lint and typecheck commands passed.
- Both app production builds passed with exit code 0.
- `pnpm install --frozen-lockfile --filter @matriz/app-seumei --filter
  @matriz/app-matriz-workbench` passed, confirming the scoped lockfile update.
