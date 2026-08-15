# MatrizLib Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the local design packages as the official MatrizLib, provide stable token/style/component contracts, add executable documentation and tests, and make adoption observable in all seven apps.

**Architecture:** `@matriz/design-system` remains pure visual data and CSS contracts; `@matriz/design-ui` remains domain-free React UI and owns Storybook. App-specific themes, navigation, persistence, domain states, Hub Alpha, and Workbench's SSR theme runtime stay local. Existing barrels and compatibility variables remain during migration.

**Tech Stack:** pnpm 9.12.0, TypeScript 5.6.3, React 19.2.x, Next.js 16.2.4, Vitest 2.1.2, Storybook 10.5.8, Testing Library 16.3.2, jsdom 30.0.1, CSS custom properties.

## Global Constraints

- Follow `docs/architectural-laws.md`, especially L3, L4, L6, and L12.
- Never import `apps/<other-app>/src/**` or `apps/<other-app>/app/**`.
- Design packages must not import integration, flows, apps, or product domain.
- Preserve all pre-existing uncommitted work; stage and commit only task-owned files.
- Keep price, premium, entitlement, tenant policy, and remote theme selection outside design packages.
- Use the `--matriz-*` namespace for new public CSS variables; retain legacy aliases for compatibility.
- WCAG 2.2 AA is the engineering baseline; never claim manual or automated coverage that was not executed.
- Workbench retains cookie-based SSR theme persistence; Hub Alpha retains its app-local `--hub-*` contract and 3D boundary.
- Do not add a new monolithic MatrizLib package or copy the external MatrizLib repository.
- Do not commit `.env`, logs, build output, temporary screenshots, `.next`, `.turbo`, or caches.

---

### Task 1: Formal token registry and public CSS contract

**Files:**
- Create: `packages/design/system/src/tokens.ts`
- Create: `packages/design/system/src/themes.ts`
- Create: `packages/design/system/src/metadata.ts`
- Create: `packages/design/system/src/tokens.css`
- Create: `packages/design/system/src/tokens.test.ts`
- Modify: `packages/design/system/src/index.ts`
- Modify: `packages/design/system/package.json`
- Modify: `packages/design/system/README.md`
- Modify: `packages/flows/themes/src/index.ts`
- Modify: `packages/flows/themes/src/appearance.test.ts`
- Modify: `packages/flows/themes/package.json`
- Modify: `apps/matriz-hub/src/domains/capabilities/application/capability-store.ts`
- Modify: `apps/matriz-hub/src/domains/capabilities/application/capability-store.test.ts`
- Modify: `apps/matriz-hub/app/settings/appearance/AppearanceSettings.tsx`

**Interfaces:**
- Produces `primitiveTokens`, `semanticTokenNames`, `componentTokenNames`, `matrizTokenMetadata`, `themeToCssVars`, `themeDefinitionToCssVars`, and public export paths `.`, `./css`, `./metadata`.
- Retains the existing root exports and legacy CSS variable aliases. Moves commercial catalog fields to `@matriz/flows-themes` while keeping the current Hub capability behavior.

- [ ] **Step 1: Write failing token-contract tests**

Assert that package and exported versions are both `0.1.0`, every semantic CSS variable starts with `--matriz-`, every light/dark app theme resolves required semantic roles, unknown registry keys fall back to `matriz-base`, and price/premium fields are absent from `ThemeDefinition`.

```ts
import { describe, expect, it } from "vitest"
import {
  DESIGN_SYSTEM_VERSION,
  appThemes,
  darkAppThemes,
  semanticTokenNames,
  themeDefinitionToCssVars,
} from "./index"

it("publishes namespaced semantic variables for every theme", () => {
  for (const appId of Object.keys(appThemes) as Array<keyof typeof appThemes>) {
    expect(darkAppThemes[appId]).toBeDefined()
    const css = themeDefinitionToCssVars("matriz-base", appId)
    for (const name of semanticTokenNames) expect(css[name]).toBeTruthy()
  }
})
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `pnpm --filter @matriz/design-system test`

Expected: failure because the split registries and namespaced contract do not exist.

- [ ] **Step 3: Implement the minimal split and CSS contract**

Move existing scales to `tokens.ts`, visual theme definitions to `themes.ts`, and descriptive token records to `metadata.ts`. Move `priceLabel` and `premium` to a `ThemeOffer` catalog in `@matriz/flows-themes`, then adapt the Hub capability store and appearance UI without changing checkout behavior. Keep compatibility re-exports in `index.ts`. Use pure readonly data.

```ts
export const semanticTokenNames = [
  "--matriz-color-canvas",
  "--matriz-color-surface",
  "--matriz-color-text",
  "--matriz-color-text-muted",
  "--matriz-color-border",
  "--matriz-color-action",
  "--matriz-color-action-text",
  "--matriz-color-focus",
  "--matriz-color-success",
  "--matriz-color-warning",
  "--matriz-color-danger",
  "--matriz-color-info",
] as const
```

`tokens.css` defines primitive/semantic defaults, light/dark mode, reduced-motion behavior, compatibility aliases, focus width/offset, type families, spacing, radius, elevation, and motion. It must not style product layouts or generic HTML elements beyond inheritable color-scheme/font defaults under `[data-matrizlib]`.

- [ ] **Step 4: Publish deliberate subpaths**

Set package version to `0.1.0` and add:

```json
"exports": {
  ".": "./src/index.ts",
  "./css": "./src/tokens.css",
  "./metadata": "./src/metadata.ts"
}
```

- [ ] **Step 5: Verify GREEN and package quality**

Run:

```powershell
pnpm --filter @matriz/design-system test
pnpm --filter @matriz/design-system typecheck
pnpm --filter @matriz/design-system lint
pnpm --filter @matriz/flows-themes test
pnpm --filter @matriz/flows-themes typecheck
pnpm --filter @matriz/app-matriz-hub test
pnpm --filter @matriz/app-matriz-hub typecheck
```

- [ ] **Step 6: Commit task-owned files**

Commit message: `feat(matrizlib): formalize token and theme contracts`.

---

### Task 2: Accessible foundational components and metadata

**Files:**
- Create: `packages/design/ui/src/layout.tsx`
- Create: `packages/design/ui/src/typography.tsx`
- Create: `packages/design/ui/src/actions.tsx`
- Create: `packages/design/ui/src/forms.tsx`
- Create: `packages/design/ui/src/feedback.tsx`
- Create: `packages/design/ui/src/info-hint.tsx`
- Create: `packages/design/ui/src/metadata.ts`
- Create: `packages/design/ui/src/components.test.tsx`
- Create: `packages/design/ui/vitest.config.ts`
- Modify: `packages/design/ui/src/primitives.tsx`
- Modify: `packages/design/ui/src/index.ts`
- Modify: `packages/design/ui/src/utility-shim.css`
- Modify: `packages/design/ui/package.json`
- Modify: `packages/design/ui/README.md`

**Interfaces:**
- Produces public `Stack`, `Inline`, `Container`, `Surface`, `Heading`, `Text`, `Button`, `Label`, `Input`, `FormField`, `Badge`, `Alert`, `EmptyState`, `InfoHint`, `componentMetadata`.
- `primitives.tsx` remains a compatibility barrel.

- [ ] **Step 1: Write failing render and interaction tests**

Test real DOM behavior with Testing Library and user-event: default button type, disabled state, input label/helper/error `aria-describedby`, invalid state, status text, InfoHint click/focus/Escape, and focus return.

```tsx
it("connects a field error to its input", () => {
  render(<FormField id="company" label="Empresa" error="Informe a empresa"><Input /></FormField>)
  const input = screen.getByRole("textbox", { name: "Empresa" })
  expect(input).toHaveAttribute("aria-invalid", "true")
  expect(input).toHaveAccessibleDescription("Informe a empresa")
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `pnpm --filter @matriz/design-ui test`

Expected: failure because the new APIs and test environment are absent.

- [ ] **Step 3: Implement components with semantic tokens**

Use native elements, forwarded refs where consumers need focus, semantic variants, and namespaced classes. `InfoHint` is a client boundary and closes on Escape/outside click while returning focus to its trigger. Avoid product copy and entities.

- [ ] **Step 4: Add single-source component metadata**

```ts
export interface ComponentMetadata {
  readonly name: string
  readonly description: string
  readonly category: "layout" | "typography" | "action" | "form" | "feedback" | "context"
  readonly status: "experimental" | "beta" | "stable" | "deprecated"
  readonly source: string
  readonly tags: readonly string[]
  readonly tokens: readonly string[]
  readonly accessibility: readonly string[]
  readonly related: readonly string[]
  readonly deprecated?: { readonly replacement: string; readonly since: string }
}
```

- [ ] **Step 5: Publish public subpaths and styles**

Set package version to `0.1.0` and add `.`, `./primitives`, `./styles.css`, and `./metadata`. Depend on the public design-system CSS rather than copying token values.

- [ ] **Step 6: Verify GREEN**

Run:

```powershell
pnpm --filter @matriz/design-ui test
pnpm --filter @matriz/design-ui typecheck
pnpm --filter @matriz/design-ui lint
```

- [ ] **Step 7: Commit task-owned files**

Commit message: `feat(matrizlib): add accessible component foundation`.

---

### Task 3: Executable Storybook documentation

**Files:**
- Create: `packages/design/ui/.storybook/main.ts`
- Create: `packages/design/ui/.storybook/preview.ts`
- Create: `packages/design/ui/.storybook/manager.ts`
- Create: `packages/design/ui/stories/overview.mdx`
- Create: `packages/design/ui/stories/foundations.mdx`
- Create: `packages/design/ui/stories/migration.mdx`
- Create: `packages/design/ui/stories/button.stories.tsx`
- Create: `packages/design/ui/stories/forms.stories.tsx`
- Create: `packages/design/ui/stories/feedback.stories.tsx`
- Create: `packages/design/ui/stories/layout.stories.tsx`
- Create: `packages/design/ui/stories/info-hint.stories.tsx`
- Modify: `packages/design/ui/package.json`

**Interfaces:**
- Storybook imports only public `@matriz/design-ui` and `@matriz/design-system` surfaces.
- Stable stories set `parameters.a11y.test = "error"`.

- [ ] **Step 1: Add pinned Storybook dependencies and scripts**

Use Storybook packages at exactly `10.5.8`, Testing Library `16.3.2`, user-event `14.6.4`, and jsdom `30.0.1`. Add `storybook` and `build-storybook` scripts.

- [ ] **Step 2: Configure public styles, themes, viewport, and a11y**

Import `@matriz/design-system/css` then `@matriz/design-ui/styles.css` in `preview.ts`. Provide toolbar globals for light/dark, comfortable/compact, and reduced/full motion, applying data attributes to the story root.

- [ ] **Step 3: Write realistic stories and conceptual pages**

Use Portuguese operational content from the ecosystem without passing domain entities. Cover default, hover-equivalent, focus, disabled, loading/`aria-busy`, long content, error, success, compact density, light/dark, and mobile viewport where relevant.

- [ ] **Step 4: Build and verify Storybook**

Run: `pnpm --filter @matriz/design-ui build-storybook`

Expected: exit 0 with generated output ignored by Git.

- [ ] **Step 5: Commit task-owned files**

Commit message: `docs(matrizlib): add executable component catalog`.

---

### Task 4: Public-style migration across all apps

**Files:**
- Modify: each app `package.json` only if a declared dependency is missing
- Modify: `apps/{matriz-hub,seumei,spot,contracts,willdash,sites}/app/globals.css`
- Modify: `apps/matriz-workbench/app/globals.css`
- Modify: the seven root `app/layout.tsx` files

**Interfaces:**
- Every app imports `@matriz/design-system/css` through a public package entry.
- Apps using shared React primitives import `@matriz/design-ui/styles.css` publicly.
- Every root `<html>` exposes `data-matrizlib="0.1.0"` without changing app theme persistence.

- [ ] **Step 1: Add a failing repository contract test**

Create `tests/smoke/matrizlib-adoption.test.ts` to enumerate the seven app layouts and stylesheets, reject `packages/design/**/src/**` CSS imports, require public CSS imports, and require the version marker.

- [ ] **Step 2: Run and confirm RED**

Run: `pnpm exec vitest run --config vitest.config.ts tests/smoke/matrizlib-adoption.test.ts`

- [ ] **Step 3: Migrate CSS imports and root markers**

Preserve all app-local CSS and existing theme attributes. Workbench imports tokens only; the other consumers import component styles when already using design-ui.

- [ ] **Step 4: Verify GREEN and scoped compilers**

Run the new smoke test, then `typecheck` for all seven app filters.

- [ ] **Step 5: Commit task-owned files**

Commit message: `refactor(matrizlib): adopt public contracts in every app`.

---

### Task 5: Real validation surfaces in SeuMei and Workbench

**Files:**
- Modify: `apps/seumei/app/owners/page.tsx`
- Create: `apps/seumei/src/ui/presenters/owner.presenter.ts`
- Test: `apps/seumei/src/ui/presenters/owner.presenter.test.ts`
- Create: `apps/seumei/vitest.config.ts`
- Modify: `apps/seumei/package.json`
- Modify: one low-risk SeuMei form/action surface selected from existing routes
- Modify: `apps/matriz-workbench/src/ui/components/theme-system-picker.tsx`
- Modify: `apps/matriz-workbench/src/ui/components/theme-system-picker.module.css`
- Test: existing or new Workbench component/presenter test
- Modify: `apps/matriz-workbench/docs/MATRIZLIB-ADOPTION.md`

**Interfaces:**
- SeuMei UI receives an `OwnerViewModel`, never an entity.
- Workbench consumes shared tokens/metadata but preserves its cookie SSR, presets, density, and local component composition.

- [ ] **Step 1: Write failing presenter and UI-contract tests**

Cover owner mapping and prove the selected surfaces use accessible labels, status text plus shape/icon, and shared token aliases without importing design-ui into Workbench.

- [ ] **Step 2: Run and confirm RED**

Add a scoped Seumei `test` script using its local Vitest config, then run the specific SeuMei and Workbench Vitest files.

- [ ] **Step 3: Implement the smallest real migrations**

Fix the existing L6 violation in SeuMei through a presenter. Apply shared FormField/Input/Button only where the existing use case and app boundary remain unchanged. In Workbench, expose MatrizLib compatibility/status in the existing theme picker without replacing its theme engine.

- [ ] **Step 4: Verify GREEN plus app quality**

Run:

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei lint
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei build
pnpm --filter @matriz/app-matriz-workbench test
pnpm --filter @matriz/app-matriz-workbench lint
pnpm --filter @matriz/app-matriz-workbench typecheck
pnpm --filter @matriz/app-matriz-workbench build
```

- [ ] **Step 5: Commit task-owned files**

Commit message: `feat(matrizlib): validate simple and dense consumers`.

---

### Task 6: Governance, lifecycle, and ecosystem verification

**Files:**
- Create: `packages/design/system/AGENTS.md`
- Create: `packages/design/ui/AGENTS.md`
- Create: `packages/design/ui/ARCHITECTURE.md`
- Create: `packages/design/ui/CONTRIBUTING.md`
- Create: `packages/design/ui/CHANGELOG.md`
- Create: `docs/matrizlib/README.md`
- Create: `docs/matrizlib/MIGRATION.md`
- Create: `docs/matrizlib/DESIGN-ALPHA.md`
- Modify: `docs/app-ownership-map.md`
- Modify: `docs/DECISION-LOG.md`

**Interfaces:**
- Documentation points to code/metadata/stories as separate explicit authorities.
- Debt is classified as `fix-now`, `migrate-later`, `retain`, `deprecate`, or `remove`.

- [ ] **Step 1: Write governance and migration documents**

Document package responsibility, allowed/forbidden imports, token proposal rules, component promotion criteria, deprecation, accessibility review, story requirements, app-local versus shared decisions, public import migration, Design Alpha usage/non-usage, and known debt.

- [ ] **Step 2: Record the source-of-truth decision**

Add a short Decision Log entry: local design packages are canonical; the external library is reference-only until a separately approved portable adoption exists.

- [ ] **Step 3: Run fresh package and ecosystem validation**

Run:

```powershell
pnpm --filter @matriz/design-system lint
pnpm --filter @matriz/design-system typecheck
pnpm --filter @matriz/design-system test
pnpm --filter @matriz/design-ui lint
pnpm --filter @matriz/design-ui typecheck
pnpm --filter @matriz/design-ui test
pnpm --filter @matriz/design-ui build-storybook
pnpm test:smoke
pnpm lint
pnpm typecheck
pnpm build
```

- [ ] **Step 4: Perform visual and accessibility inspection**

Start Storybook, SeuMei, and Workbench; inspect desktop and mobile, keyboard focus order, Escape behavior, reduced motion, long content, error states, and light/dark. Store only intentional evidence and record any unavailable manual checks as unverified.

- [ ] **Step 5: Check forbidden artifacts and boundaries**

Run `git status --short`, inspect every changed file, confirm no `.env`, logs, build output, screenshots without purpose, deep app imports, or product-domain types entered packages.

- [ ] **Step 6: Commit task-owned documentation**

Commit message: `docs(matrizlib): establish governance and migration guidance`.
