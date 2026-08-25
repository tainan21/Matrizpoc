# Seumei Catalog / Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar Products Admin funcional, isolado por tenant e sustentado por um domínio Catalog reutilizável pelos próximos slices Store e Orders.

**Architecture:** Catalog permanece em `apps/seumei`, com domínio, aplicação, presenter e infraestrutura de fixtures separados. O repositório valida e se vincula ao `SeumeiTenantContext`; a UI consome view models e chama o serviço de aplicação para mutações.

**Tech Stack:** TypeScript 5.6, React 19, Next.js 16, Vitest, Testing Library, MatrizLib (`@matriz/design-ui`).

**Spec:** `docs/superpowers/specs/2026-08-24-seumei-catalog-products-design.md`

## Global Constraints

- Trabalhar somente em `apps/seumei` e nos documentos de checkpoint deste slice.
- Nunca importar internals de outro app.
- Product, ProductCategory e ProductModifier permanecem app-local.
- Toda operação recebe `SeumeiTenantContext` ou um repositório já vinculado.
- Galáxia Burger e Matriz Labs devem permanecer completamente isoladas.
- UI consome view models, não entidades cruas.
- Pricing usa centavos inteiros e não vive no React.
- Reutilizar `Button`, `Input` e `FormField` da MatrizLib.

---

### Task 1: Catalog domain and pricing

**Files:**
- Create: `apps/seumei/src/domains/catalog/domain/catalog.ts`
- Create: `apps/seumei/src/domains/catalog/domain/pricing.ts`
- Test: `apps/seumei/src/domains/catalog/domain/pricing.test.ts`

**Interfaces:**
- Consumes: `CompanyId` from Companies.
- Produces: `Product`, `ProductCategory`, `ProductModifier`, branded IDs, `SaveProductInput`, and `calculateOrderItemPrice`.

- [ ] **Step 1: Write failing pricing tests**

Cover base price × quantity, modifier totals, unavailable items, non-positive quantity and modifier company mismatch.

- [ ] **Step 2: Run pricing tests and confirm RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/domains/catalog/domain/pricing.test.ts`

Expected: FAIL because `pricing.ts` and its exports do not exist.

- [ ] **Step 3: Implement minimal domain types and pricing**

Use integer cents and return a discriminated result:

```ts
type PriceCalculationResult =
  | { ok: true; price: { baseCents: number; modifiersCents: number; subtotalCents: number; totalCents: number } }
  | { ok: false; error: "invalid-quantity" | "product-unavailable" | "modifier-unavailable" | "modifier-company-mismatch" }
```

- [ ] **Step 4: Run focused tests and confirm GREEN**

- [ ] **Step 5: Commit**

```bash
git add apps/seumei/src/domains/catalog/domain
git commit -m "feat(seumei): add catalog domain pricing"
```

### Task 2: Tenant-bound catalog repository and fixtures

**Files:**
- Create: `apps/seumei/src/domains/catalog/domain/catalog.repository.ts`
- Create: `apps/seumei/src/fixtures/catalog.ts`
- Create: `apps/seumei/src/mock/catalog.repository.ts`
- Test: `apps/seumei/src/mock/catalog.repository.test.ts`
- Modify: `apps/seumei/src/domains/memberships/domain/membership.ts`
- Modify: `apps/seumei/src/fixtures/memberships.ts`

**Interfaces:**
- Consumes: domain types from Task 1, `MembershipRepository`, `SeumeiTenantContext`.
- Produces: `CatalogRepository.bind(context)` and `TenantCatalogRepository`.

- [ ] **Step 1: Write failing isolation tests**

Create contexts for both fixture tenants and prove list, edit and duplicate never cross company boundaries. Add a context whose membership ID is forged and expect `bind` to return `null`.

- [ ] **Step 2: Run repository tests and confirm RED**

- [ ] **Step 3: Add fixture categories, modifiers and products**

Every record carries `companyId`. Galáxia Burger has seven products; Matriz Labs has two independent products.

- [ ] **Step 4: Implement bound mutable repository**

Clone fixture arrays per repository instance. `bind` verifies active membership and returns methods that never accept company IDs.

- [ ] **Step 5: Add `products.manage` permission to owners/admin fixtures**

- [ ] **Step 6: Run focused and existing tenant tests**

- [ ] **Step 7: Commit**

```bash
git add apps/seumei/src/domains/catalog/domain/catalog.repository.ts apps/seumei/src/fixtures/catalog.ts apps/seumei/src/mock/catalog.repository.ts apps/seumei/src/mock/catalog.repository.test.ts apps/seumei/src/domains/memberships/domain/membership.ts apps/seumei/src/fixtures/memberships.ts
git commit -m "feat(seumei): bind catalog repositories to tenant context"
```

### Task 3: Catalog application service and presenter

**Files:**
- Create: `apps/seumei/src/domains/catalog/application/catalog.service.ts`
- Test: `apps/seumei/src/domains/catalog/application/catalog.service.test.ts`
- Create: `apps/seumei/src/domains/catalog/presentation/catalog.presenter.ts`
- Test: `apps/seumei/src/domains/catalog/presentation/catalog.presenter.test.ts`
- Modify: `apps/seumei/src/lib/container.ts`
- Modify: `apps/seumei/src/domains/memberships/presentation/SeumeiTenantProvider.tsx`

**Interfaces:**
- Consumes: `CatalogRepository` and tenant context.
- Produces: `CatalogService`, `CatalogViewModel`, mutation results, and provider access to the scoped service.

- [ ] **Step 1: Write failing service authorization tests**

Prove read requires `products.view`, mutation requires `products.manage`, and cross-tenant IDs return `product-not-found`.

- [ ] **Step 2: Run service tests and confirm RED**

- [ ] **Step 3: Implement minimal service**

Validate input before `saveProduct`; obtain categories/modifiers from the bound repository; never accept company ID from the input.

- [ ] **Step 4: Write failing presenter tests**

Assert BRL formatting, total/active/low/out-of-stock/featured metrics, category labels and stable table rows.

- [ ] **Step 5: Implement presenter and confirm GREEN**

- [ ] **Step 6: Compose a session-scoped demo runtime**

The tenant provider exposes the `CatalogService` created from the same mutable repository instance for the lifetime of the authenticated session.

- [ ] **Step 7: Run all catalog and tenant tests**

- [ ] **Step 8: Commit**

```bash
git add apps/seumei/src/domains/catalog apps/seumei/src/lib/container.ts apps/seumei/src/domains/memberships/presentation/SeumeiTenantProvider.tsx
git commit -m "feat(seumei): add authorized catalog application service"
```

### Task 4: Products Admin screen

**Files:**
- Create: `apps/seumei/src/domains/catalog/presentation/ProductsScreen.tsx`
- Create: `apps/seumei/src/domains/catalog/presentation/ProductEditorDialog.tsx`
- Test: `apps/seumei/src/domains/catalog/presentation/ProductsScreen.test.tsx`
- Create: `apps/seumei/src/ui/styles/seumei-products.css`
- Modify: `apps/seumei/app/globals.css`
- Modify: `apps/seumei/src/domains/hub/presentation/CompanyWorkspaceScreen.tsx`

**Interfaces:**
- Consumes: `CatalogService`, `CatalogViewModel`, current trusted tenant context.
- Produces: functional list/search/filter/create/edit/duplicate/availability/featured UI.

- [ ] **Step 1: Write failing component tests**

Render with an injected service. Assert rows, search filtering, availability mutation, duplicate action and create/edit submission.

- [ ] **Step 2: Run component tests and confirm RED**

- [ ] **Step 3: Implement the screen with MatrizLib primitives**

Use semantic table markup on desktop and responsive row cards below 760px. All buttons have accessible names; toggles remain keyboard-operable.

- [ ] **Step 4: Implement the editor dialog**

Use native `<dialog>` semantics through an accessible fixed overlay, `FormField`, `Input`, and `Button`; validate required fields and numeric ranges before service submission.

- [ ] **Step 5: Implement high-fidelity styling**

Match the approved reference: five metric cards, purple accent, 54–58px rows, compact 11–13px type, precise borders, category tabs, filters and dark surfaces.

- [ ] **Step 6: Dispatch Products from the dynamic app route**

When the authorized active app is `products`, render `ProductsScreen`; all other apps keep the workspace placeholder.

- [ ] **Step 7: Run component and full Seumei tests**

- [ ] **Step 8: Commit**

```bash
git add apps/seumei/src/domains/catalog/presentation apps/seumei/src/ui/styles/seumei-products.css apps/seumei/app/globals.css apps/seumei/src/domains/hub/presentation/CompanyWorkspaceScreen.tsx
git commit -m "feat(seumei): implement products admin experience"
```

### Task 5: Registry-driven contextual navigation

**Files:**
- Modify: `apps/seumei/src/ui/components/AppShell.tsx`
- Test: `apps/seumei/src/ui/components/AppShell.test.tsx`

**Interfaces:**
- Consumes: `findAppDefinition(activeApp.id).navigation`.
- Produces: shell navigation derived from the typed app registry.

- [ ] **Step 1: Write a failing Products navigation test**

Assert Products and Categories links are built from the registry and generic “Atividade” is absent.

- [ ] **Step 2: Run the focused test and confirm RED**

- [ ] **Step 3: Implement registry-driven mapping**

Join `activeApp.href` with each relative navigation path. Keep Hub navigation unchanged.

- [ ] **Step 4: Run shell tests and confirm GREEN**

- [ ] **Step 5: Commit**

```bash
git add apps/seumei/src/ui/components/AppShell.tsx apps/seumei/src/ui/components/AppShell.test.tsx
git commit -m "refactor(seumei): drive contextual navigation from app registry"
```

### Task 6: Verification, visual correction and checkpoint

**Files:**
- Modify: `docs/seumei/Seumei-Progress-and-Roadmap-2026-08-24.docx` only if the checkpoint is intentionally refreshed.
- Create: `docs/superpowers/plans/2026-08-24-seumei-catalog-products.md` progress marks through this file.

**Interfaces:**
- Consumes: completed Tasks 1–5.
- Produces: a tested, visually reviewed Products slice ready for Store/Commerce.

- [ ] **Step 1: Run scoped verification serially**

```bash
corepack pnpm --filter @matriz/app-seumei test
corepack pnpm --filter @matriz/app-seumei typecheck
corepack pnpm --filter @matriz/app-seumei lint
```

- [ ] **Step 2: Run global smoke**

```bash
corepack pnpm test:smoke
```

- [ ] **Step 3: Run the Web application and inspect**

Verify Galáxia Burger Products, create/edit/duplicate/toggles, company switch to Matriz Labs, and return to Galáxia without leakage.

- [ ] **Step 4: Compare to the supplied Products reference**

Review geometry, five metric cards, sidebar/topbar proportions, tabs, filters, table density, status colors, typography and mobile composition. Correct visible deviations.

- [ ] **Step 5: Verify responsive surfaces**

Inspect 390×844, 768×1024, 1180×820 and 1440×900 with no uncontrolled horizontal clipping.

- [ ] **Step 6: Record checkpoint and commit**

```bash
git add docs/superpowers/plans/2026-08-24-seumei-catalog-products.md
git commit -m "docs(seumei): checkpoint catalog products slice"
```
