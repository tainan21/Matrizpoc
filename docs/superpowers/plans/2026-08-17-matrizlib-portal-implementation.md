# MatrizLib Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `apps/matrizlib` as the eighth Matriz application, with an editorial landing page, a validated C001-C099 component catalog, component detail routes, a canonical theme laboratory, architecture guidance, and durable incremental-migration boundaries.

**Architecture:** The application owns documentation, navigation, previews, and catalog metadata. `@matriz/design-system` remains authoritative for tokens/themes and `@matriz/design-ui` remains authoritative for stable components. Global app identifiers, base URLs, manifests, and smoke expectations expand to include `matrizlib`; external code under `C:\Apps\matrizlibUI` remains reference-only.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.6, CSS Modules/global CSS, Vitest, Testing Library, existing Matriz design/integration packages, Playwright for browser verification.

## Global Constraints

- The application runs on port `3007` and uses package name `@matriz/app-matrizlib`.
- Catalog contains exactly C001-C099; C100 ThemeSwatches is excluded from this release.
- Only entries reconciled to real `@matriz/design-ui` exports use stage `available` and an `importPath`.
- Candidate entries are visible documentation, not fake stable exports.
- No runtime dependency, deep import, file copy, or alias points to `C:\Apps\matrizlibUI`.
- Themes come only from `@matriz/design-system`; the portal does not duplicate values or commercial policy.
- UI remains domain-free and consumes catalog view models.
- All new interactive behavior is implemented through a witnessed red-green TDD cycle.
- Root registry/identifier changes require global smoke and boundary validation.

---

### Task 1: Extend the ecosystem identity for MatrizLib

**Files:**
- Modify: `packages/foundation/constants/src/index.ts`
- Modify: `packages/platform/config/src/index.ts`
- Modify: `packages/design/system/src/themes.ts`
- Modify: `packages/design/system/src/tokens.test.ts`
- Modify: `packages/flows/ecosystem/src/index.tsx`
- Modify: affected exhaustive `Record<MatrizAppId, ...>` surfaces found by typecheck

**Interfaces:**
- Produces: `MatrizAppId` member `"matrizlib"`, base URL `http://localhost:3007`, light/dark app theme tokens, and ecosystem label `MatrizLib`.
- Consumes: existing `MatrizAppId`, `AppThemeTokens`, `monorepoConfig`, and CSS-variable contracts.

- [ ] **Step 1: Add a failing design-system test**

```ts
it("resolves the MatrizLib base theme in both color modes", () => {
  expect(themeDefinitionToCssVars("matriz-base", "matrizlib", "light")["--matriz-theme-key"]).toBe("matriz-base")
  expect(themeDefinitionToCssVars("matriz-base", "matrizlib", "dark")["--matriz-color-text"]).toBeTruthy()
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @matriz/design-system test -- --run src/tokens.test.ts`
Expected: TypeScript/test failure because `matrizlib` is not a valid app ID or theme key.

- [ ] **Step 3: Add the identifier, URL, labels, and light/dark theme records**

Use `matrizlib` consistently; do not add a new package or theme registry. Add MatrizLib to `ALL_MATRIZ_APPS` so future canonical themes can opt in through existing behavior.

- [ ] **Step 4: Run design-system tests and root typecheck**

Run: `pnpm --filter @matriz/design-system test && pnpm run typecheck`
Expected: PASS; exhaustive records reveal every integration surface that required the eighth identifier.

- [ ] **Step 5: Commit the ecosystem identity change**

```bash
git add packages/foundation/constants packages/platform/config packages/design/system packages/flows/ecosystem
git commit -m "feat(matrizlib): register ecosystem identity"
```

### Task 2: Scaffold the application contract and bootstrap

**Files:**
- Create: `apps/matrizlib/AGENTS.md`
- Create: `apps/matrizlib/README.md`
- Create: `apps/matrizlib/docs/AGENT-START-HERE.md`
- Create: `apps/matrizlib/package.json`
- Create: `apps/matrizlib/tsconfig.json`
- Create: `apps/matrizlib/next.config.mjs`
- Create: `apps/matrizlib/vitest.config.ts`
- Create: `apps/matrizlib/public-contract.ts`
- Create: `apps/matrizlib/src/manifest/manifest.ts`
- Create: `apps/matrizlib/src/manifest/manifest.test.ts`
- Create: `apps/matrizlib/src/bootstrap/index.ts`
- Create: `apps/matrizlib/src/bootstrap/bootstrap-provider.tsx`

**Interfaces:**
- Produces: public manifest-only contract, idempotent `bootstrap()`, and `MatrizLibBootstrapProvider`.
- Consumes: registry, manifests, onboarding, events, telemetry, and app ID contracts through public packages only.

- [ ] **Step 1: Write the failing manifest test**

```ts
it("declares the five public MatrizLib routes", () => {
  expect(manifest.appId).toBe("matrizlib")
  expect(manifest.routes.map((route) => route.path)).toEqual([
    "/", "/components", "/components/[slug]", "/themes", "/architecture",
  ])
})
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @matriz/app-matrizlib test`
Expected: FAIL because the app package and manifest do not exist.

- [ ] **Step 3: Create the minimum app configuration, ownership docs, manifest, public contract, and bootstrap**

The manifest describes a public design/reference application and no product events. Bootstrap registers once and exposes only provider configuration.

- [ ] **Step 4: Verify scoped test/typecheck/lint**

Run: `pnpm --filter @matriz/app-matrizlib test && pnpm --filter @matriz/app-matrizlib typecheck && pnpm --filter @matriz/app-matrizlib lint`
Expected: PASS.

- [ ] **Step 5: Commit the application boundary**

```bash
git add apps/matrizlib
git commit -m "feat(matrizlib): scaffold portal contract"
```

### Task 3: Create and validate the C001-C099 catalog

**Files:**
- Create: `apps/matrizlib/src/catalog/types.ts`
- Create: `apps/matrizlib/src/catalog/component-catalog.ts`
- Create: `apps/matrizlib/src/catalog/catalog.test.ts`
- Create: `apps/matrizlib/src/catalog/query.ts`
- Create: `apps/matrizlib/src/catalog/query.test.ts`
- Create: `apps/matrizlib/src/catalog/presenters.ts`
- Create: `apps/matrizlib/src/catalog/presenters.test.ts`

**Interfaces:**
- Produces: `ComponentCatalogEntry`, `componentCatalog`, `findComponentBySlug`, `filterComponentCatalog`, and portal view models.
- Consumes: audited C001-C099 inventory and public `componentMetadata` from `@matriz/design-ui/metadata`.

- [ ] **Step 1: Write failing integrity tests**

```ts
it("contains exactly the unique audited C001-C099 range", () => {
  expect(componentCatalog).toHaveLength(99)
  expect(new Set(componentCatalog.map((entry) => entry.id)).size).toBe(99)
  expect(componentCatalog[0]?.id).toBe("C001")
  expect(componentCatalog.at(-1)?.id).toBe("C099")
})

it("allows import paths only for available entries", () => {
  expect(componentCatalog.every((entry) => entry.stage === "available" ? Boolean(entry.importPath) : !entry.importPath)).toBe(true)
})
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @matriz/app-matrizlib test -- src/catalog/catalog.test.ts`
Expected: FAIL because the catalog does not exist.

- [ ] **Step 3: Implement types and all 99 honest catalog entries**

Reconcile names/stages with `docs/visual-route-audit-2026-08-17.md`. Mark the 14 current canonical metadata exports available; classify remaining entries without publishing fake imports.

- [ ] **Step 4: Add failing query/presenter tests**

```ts
it("filters by text, category, and stage together", () => {
  expect(filterComponentCatalog(componentCatalog, { query: "button", category: "input", stage: "available" }).map((entry) => entry.name)).toContain("Button")
})
```

- [ ] **Step 5: Implement pure query and presenter functions, then verify GREEN**

Run: `pnpm --filter @matriz/app-matrizlib test`
Expected: PASS with 99 unique entries and deterministic filters.

- [ ] **Step 6: Commit the catalog contract**

```bash
git add apps/matrizlib/src/catalog
git commit -m "feat(matrizlib): catalog audited UI candidates"
```

### Task 4: Build the visual foundation and editorial landing page

**Files:**
- Create: `apps/matrizlib/app/layout.tsx`
- Create: `apps/matrizlib/app/globals.css`
- Create: `apps/matrizlib/app/page.tsx`
- Create: `apps/matrizlib/src/ui/site-header.tsx`
- Create: `apps/matrizlib/src/ui/site-footer.tsx`
- Create: `apps/matrizlib/src/ui/token-specimen.tsx`
- Create: `apps/matrizlib/src/ui/reveal.tsx`
- Create: `apps/matrizlib/src/ui/reveal.test.tsx`

**Interfaces:**
- Produces: global portal shell, full-bleed landing page, reduced-motion-safe reveal, and canonical token specimen.
- Consumes: `ThemeController`, `Stack`, `Inline`, `Heading`, `Text`, `Button`, canonical CSS, and catalog counts.

- [ ] **Step 1: Write a failing DOM test for reduced-motion-safe reveal content**

```tsx
it("keeps revealed content available without animation state", () => {
  render(<Reveal><p>Canonical visual contracts</p></Reveal>)
  expect(screen.getByText("Canonical visual contracts")).toBeVisible()
})
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @matriz/app-matrizlib test -- src/ui/reveal.test.tsx`
Expected: FAIL because `Reveal` does not exist.

- [ ] **Step 3: Implement shell, CSS, motion, and landing sections**

Use a full-bleed hero, strong `MatrizLib` identity, one accent, no hero card, no generic card mosaic, and concise product copy. Include package authority, component proof, theme preview, governance, and final CTA.

- [ ] **Step 4: Verify DOM tests, lint, and typecheck**

Run: `pnpm --filter @matriz/app-matrizlib test && pnpm --filter @matriz/app-matrizlib lint && pnpm --filter @matriz/app-matrizlib typecheck`
Expected: PASS.

- [ ] **Step 5: Commit the landing experience**

```bash
git add apps/matrizlib/app apps/matrizlib/src/ui
git commit -m "feat(matrizlib): build editorial library portal"
```

### Task 5: Build catalog search and component detail routes

**Files:**
- Create: `apps/matrizlib/app/components/page.tsx`
- Create: `apps/matrizlib/app/components/[slug]/page.tsx`
- Create: `apps/matrizlib/src/ui/catalog/catalog-explorer.tsx`
- Create: `apps/matrizlib/src/ui/catalog/catalog-explorer.test.tsx`
- Create: `apps/matrizlib/src/ui/catalog/component-preview.tsx`
- Create: `apps/matrizlib/src/ui/catalog/component-detail.tsx`

**Interfaces:**
- Produces: searchable/filterable catalog, detail page, stable live previews, honest candidate specimens, and `generateStaticParams`.
- Consumes: catalog query/presenter functions and public design-ui exports only.

- [ ] **Step 1: Write a failing filter interaction test**

```tsx
it("filters the catalog and announces the result count", async () => {
  render(<CatalogExplorer entries={componentCatalog} />)
  await userEvent.type(screen.getByRole("searchbox"), "Button")
  expect(screen.getByRole("status")).toHaveTextContent("1 componente")
})
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @matriz/app-matrizlib test -- src/ui/catalog/catalog-explorer.test.tsx`
Expected: FAIL because the explorer does not exist.

- [ ] **Step 3: Implement catalog, detail, previews, filters, URL-friendly links, and not-found behavior**

Use buttons/forms with visible labels, stage text plus color, and 44px mobile targets. Stable previews use real exports; candidate previews label intended anatomy and states.

- [ ] **Step 4: Verify route and interaction tests**

Run: `pnpm --filter @matriz/app-matrizlib test && pnpm --filter @matriz/app-matrizlib typecheck`
Expected: PASS.

- [ ] **Step 5: Commit component discovery**

```bash
git add apps/matrizlib/app/components apps/matrizlib/src/ui/catalog
git commit -m "feat(matrizlib): add component discovery routes"
```

### Task 6: Build the theme laboratory and architecture guide

**Files:**
- Create: `apps/matrizlib/app/themes/page.tsx`
- Create: `apps/matrizlib/app/architecture/page.tsx`
- Create: `apps/matrizlib/src/ui/theme/theme-lab.tsx`
- Create: `apps/matrizlib/src/ui/theme/theme-lab.test.tsx`
- Create: `apps/matrizlib/src/ui/theme/theme-specimen.tsx`
- Create: `apps/matrizlib/src/ui/architecture/package-map.tsx`
- Create: `apps/matrizlib/src/ui/architecture/migration-steps.tsx`

**Interfaces:**
- Produces: theme/mode/density/viewport controls and a static architecture/migration reference.
- Consumes: `themeRegistry`, `themeDefinitionToCssVars`, canonical tokens, and approved migration rules.

- [ ] **Step 1: Write a failing theme-control test**

```tsx
it("applies a canonical theme to the isolated specimen", async () => {
  render(<ThemeLab />)
  await userEvent.selectOptions(screen.getByLabelText("Tema"), "aurora")
  expect(screen.getByTestId("theme-specimen")).toHaveStyle({ "--matriz-theme-key": "aurora" })
})
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @matriz/app-matrizlib test -- src/ui/theme/theme-lab.test.tsx`
Expected: FAIL because the laboratory does not exist.

- [ ] **Step 3: Implement the isolated laboratory and architecture page**

Do not persist Hub entitlement or duplicate registry values. Explain packages, hooks, scripts, tests, promotion, ownership, and the external-reference boundary.

- [ ] **Step 4: Verify focused tests and application build**

Run: `pnpm --filter @matriz/app-matrizlib test && pnpm --filter @matriz/app-matrizlib build`
Expected: PASS and five public routes plus generated detail pages.

- [ ] **Step 5: Commit laboratory and architecture**

```bash
git add apps/matrizlib/app/themes apps/matrizlib/app/architecture apps/matrizlib/src/ui/theme apps/matrizlib/src/ui/architecture
git commit -m "feat(matrizlib): add theme and architecture labs"
```

### Task 7: Register MatrizLib with Hub and global smoke tests

**Files:**
- Modify: `apps/matriz-hub/src/bootstrap/index.ts`
- Modify: `apps/matriz-hub/src/ui/structure/registry-source.ts` or its manifest aggregator
- Modify: `tests/smoke/manifests.test.ts`
- Modify: `tests/smoke/registry.test.ts`
- Modify: `tests/smoke/public-contracts.test.ts`
- Modify: any explicit seven-app ownership/boundary expectations found by `rg`

**Interfaces:**
- Produces: eighth registry entry with `http://localhost:3007` and tested public contract.
- Consumes: `@apps/matrizlib/public-contract` only; never imports `apps/matrizlib/src/**` from another app.

- [ ] **Step 1: Update smoke expectations first and verify RED**

```ts
expect(registry.list()).toHaveLength(8)
expect(registry.get("matrizlib")?.baseUrl).toBe("http://localhost:3007")
```

Run: `pnpm run test:smoke`
Expected: FAIL because the Hub does not yet aggregate MatrizLib.

- [ ] **Step 2: Add only the public manifest import and registry mapping**

Keep the Hub aggregator manifest-only and update factual docs/counts that are part of tested surfaces.

- [ ] **Step 3: Verify smoke and boundaries GREEN**

Run: `pnpm run test:smoke`
Expected: PASS with eight apps.

- [ ] **Step 4: Commit ecosystem integration**

```bash
git add apps/matriz-hub tests/smoke
git commit -m "feat(hub): register MatrizLib portal"
```

### Task 8: Browser verification, full gates, documentation, and Git integration

**Files:**
- Modify: `docs/matrizlib/README.md`
- Modify: `docs/matrizlib/MIGRATION.md`
- Modify: `docs/DECISION-LOG.md`
- Modify: `docs/app-ownership-map.md`
- Create: `apps/matrizlib/docs/VERIFICATION.md`

**Interfaces:**
- Produces: reproducible validation evidence and final documented ownership.
- Consumes: all prior task outputs.

- [ ] **Step 1: Run the app and verify browser routes**

Run: `pnpm --filter @matriz/app-matrizlib dev`
Verify at desktop 1440x1000 and mobile 390x844: `/`, `/components`, one available detail, one candidate detail, `/themes`, `/architecture`, and an unknown component slug. Verify keyboard navigation, visible focus, filter announcements, reduced motion, theme switching, and no console errors.

- [ ] **Step 2: Capture final desktop/mobile evidence**

Store ignored screenshots under `output/matrizlib-verification/`; do not commit screenshots or browser traces.

- [ ] **Step 3: Update durable documentation and decision log**

Record the eighth app, portal/package authority split, external reference policy, C001-C099 scope, validation commands, and known candidate backlog.

- [ ] **Step 4: Run scoped gates**

Run: `pnpm --filter @matriz/app-matrizlib test && pnpm --filter @matriz/app-matrizlib lint && pnpm --filter @matriz/app-matrizlib typecheck && pnpm --filter @matriz/app-matrizlib build`
Expected: all exit 0.

- [ ] **Step 5: Run full monorepo gates**

Run in order:

```bash
pnpm run build
pnpm run typecheck
pnpm run lint
pnpm run test:smoke
pnpm run prisma:validate
```

Expected: every command exits 0 with no forbidden imports or tracked artifacts.

- [ ] **Step 6: Audit and commit final documentation**

Run: `git diff --check && git status --short && git ls-files | rg "(^|/)(\.env|\.next|\.turbo|node_modules|output|.*\.log)(/|$)"`
Expected: no whitespace errors, secrets, caches, logs, or screenshots staged.

```bash
git add docs apps/matrizlib/docs
git commit -m "docs(matrizlib): record portal verification"
```

- [ ] **Step 7: Integrate origin/main and revalidate**

Run: `git fetch origin`, check ancestry, merge `origin/main` only if it is not already an ancestor, then repeat the complete gates after any merge.

- [ ] **Step 8: Push and confirm synchronization**

Run: `git push -u origin codex/matriz-hub-alpha` and verify `git status --short --branch` reports a clean synchronized worktree.
