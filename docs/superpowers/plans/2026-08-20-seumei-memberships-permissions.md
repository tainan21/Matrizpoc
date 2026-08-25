# Seumei Company Shell, Memberships and Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a persistent company shell where authorized operators manage real Core memberships and expiring invitations while every read and mutation remains tenant-scoped on the server.

**Architecture:** Core owns generic app-scoped membership invitations and persisted memberships. Seumei owns its role/capability policy, application services, HTTP boundaries, presenters and UI; administrative operations derive the tenant from the active authorized company and never accept tenant authority from the browser.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/PostgreSQL, Vitest, Testing Library, public MatrizLib exports and Playwright CLI.

**Spec:** `docs/superpowers/specs/2026-08-20-seumei-memberships-permissions-design.md`

## Global Constraints

- Keep product domain inside `apps/seumeiapp`; do not create or extend shared permission packages.
- Core remains the sole authority for users, tenants, app registrations, memberships and invitations.
- Do not import another app's `src/**` or `app/**` internals.
- Never accept `tenantId` from the browser as authority.
- Plain invitation tokens must not be persisted, listed, logged or emitted.
- No owner invitation, demotion, removal or transfer in this slice.
- No email provider, custom role or future product placeholder.
- UI consumes app-local view models, not raw Prisma/domain rows.
- Use strict red-green-refactor cycles and commit each independently reviewable task.

---

### Task 1: Record the active assimilation and model Core invitations

**Files:**
- Modify: `docs/seumei-migration-ledger.md`
- Modify: `prisma/schemas/core.prisma`
- Create: `prisma/migrations/core/202608200001_membership_invitations/migration.sql`
- Create: `apps/seumeiapp/src/domain/membership-schema.contract.test.ts`

**Interfaces:**
- Consumes: Core `Tenant`, `User`, `MembershipRole` and `AppRegistration`.
- Produces: Prisma `MembershipInvitation`, `MembershipInvitationStatus` and the database constraints used by Task 3.

- [ ] **Step 1: Update the ledger before domain code**

Mark shell/memberships as `EM ASSIMILAÇÃO`, record that reference roles are local mocks, and document Core invitation persistence plus negative two-tenant tests.

- [ ] **Step 2: Write the failing schema contract test**

```ts
it("models app-scoped hashed invitations with explicit lifecycle", () => {
  expect(coreSchema).toContain("model MembershipInvitation")
  expect(coreSchema).toContain("tokenHash")
  expect(coreSchema).toContain("@@unique([tenantId, appId, email])")
  expect(coreSchema).not.toContain("token String")
})
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/domain/membership-schema.contract.test.ts`

Expected: FAIL because the Core schema has no invitation model.

- [ ] **Step 4: Add the additive Prisma model and SQL migration**

Define `MembershipInvitation` with tenant and named inviter/acceptor user relations, normalized email, role, unique token hash, status, expiry/audit timestamps, `(tenantId, appId, email)` uniqueness and tenant/app/status indexes. Create matching PostgreSQL enum, table, foreign keys and indexes without altering existing data.

- [ ] **Step 5: Validate GREEN and Prisma**

Run:

```powershell
corepack pnpm --filter @matriz/app-seumei test -- src/domain/membership-schema.contract.test.ts
corepack pnpm run prisma:validate
```

Expected: PASS and all schemas valid.

- [ ] **Step 6: Commit**

```powershell
git add docs/seumei-migration-ledger.md prisma/schemas/core.prisma prisma/migrations/core/202608200001_membership_invitations/migration.sql apps/seumeiapp/src/domain/membership-schema.contract.test.ts
git commit -m "feat(seumei): model membership invitations"
```

### Task 2: Define Seumei role capabilities and membership domain

**Files:**
- Create: `apps/seumeiapp/src/domain/membership.ts`
- Create: `apps/seumeiapp/src/domain/membership.test.ts`

**Interfaces:**
- Consumes: canonical `CompanyRole`.
- Produces: `MembershipCapability`, `can`, `canInviteRole`, `canManageRole`, `normalizeInvitationEmail`, member/invitation domain types and validation errors.

- [ ] **Step 1: Write failing role-matrix tests**

```ts
it.each([
  ["OWNER", "members.invite.admin", true],
  ["ADMIN", "members.invite.admin", false],
  ["ADMIN", "members.invite.standard", true],
  ["MEMBER", "members.read", false],
  ["VIEWER", "workspace.read", true],
] as const)("maps %s and %s to %s", (role, capability, allowed) => {
  expect(can(role, capability)).toBe(allowed)
})

it("never allows owner invitation or mutation", () => {
  expect(canInviteRole("OWNER", "OWNER")).toBe(false)
  expect(canManageRole("OWNER", "OWNER")).toBe(false)
})
```

- [ ] **Step 2: Run and verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/domain/membership.test.ts`

Expected: FAIL because `membership.ts` does not exist.

- [ ] **Step 3: Implement the pure policy**

Use literal capability sets per role. `canInviteRole` and `canManageRole` must distinguish admin targets from standard targets and reject owner targets. Normalize email with `trim().toLowerCase()` and reject malformed or oversized input.

- [ ] **Step 4: Run and verify GREEN**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/domain/membership.test.ts`

Expected: all policy and validation cases pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/seumeiapp/src/domain/membership.ts apps/seumeiapp/src/domain/membership.test.ts
git commit -m "feat(seumei): define membership capability policy"
```

### Task 3: Extend the Core repository with scoped membership persistence

**Files:**
- Modify: `apps/seumeiapp/src/domain/repositories/core-access-repository.ts`
- Modify: `apps/seumeiapp/src/infrastructure/core-access.repository.ts`
- Modify: `apps/seumeiapp/src/infrastructure/core-access.repository.test.ts`

**Interfaces:**
- Consumes: Task 1 Prisma models and Task 2 domain types.
- Produces: `listTenantMembers`, `listPendingInvitations`, `createInvitation`, `revokeInvitation`, `acceptInvitation`, `changeMembershipRole`, and `removeMembership` repository methods.

- [ ] **Step 1: Add failing repository contract tests**

Tests must prove exact Prisma scopes:

```ts
expect(findManyArgs.where).toEqual({ tenantId: "tenant_a", appId: "seumei" })
expect(updateManyArgs.where).toMatchObject({
  id: "membership_b",
  tenantId: "tenant_a",
  appId: "seumei",
})
```

Add acceptance cases for valid token/email, wrong email, expired, revoked, wrong app, replay by another user and idempotent replay by the same user. Assert observable returned state and transaction effects, not mock existence.

- [ ] **Step 2: Run and verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/infrastructure/core-access.repository.test.ts`

Expected: FAIL because the repository methods and invitation delegate do not exist.

- [ ] **Step 3: Implement minimal scoped queries and transactions**

Hash tokens with SHA-256 before repository lookup. `createInvitation` receives a pre-hashed token and upserts `(tenantId, appId, email)`. Acceptance validates all invitation conditions and enabled app registration inside one Core transaction, then upserts membership and marks acceptance.

Role change/removal must use tenant/app-scoped `updateMany`/`deleteMany` and return `null` when no authorized target matches.

- [ ] **Step 4: Run and verify GREEN**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/infrastructure/core-access.repository.test.ts`

Expected: all existing provisioning and new membership persistence cases pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/seumeiapp/src/domain/repositories/core-access-repository.ts apps/seumeiapp/src/infrastructure/core-access.repository.ts apps/seumeiapp/src/infrastructure/core-access.repository.test.ts
git commit -m "feat(seumei): persist scoped membership lifecycle"
```

### Task 4: Implement authorized membership application services

**Files:**
- Create: `apps/seumeiapp/src/application/company-memberships.ts`
- Create: `apps/seumeiapp/src/application/company-memberships.test.ts`
- Modify: `apps/seumeiapp/src/application/composition.ts`

**Interfaces:**
- Consumes: authorized company context, role policy and Core repository.
- Produces: `readCompanyMembers`, `inviteCompanyMember`, `revokeCompanyInvitation`, `changeCompanyMemberRole`, `removeCompanyMember`, `readInvitation`, and `acceptCompanyInvitation`.

- [ ] **Step 1: Write failing authorization tests**

```ts
await expect(readCompanyMembers(memberContext, core)).rejects.toThrow(MembershipCapabilityDeniedError)
await expect(inviteCompanyMember(adminContext, { email, role: "ADMIN" }, core, tokens, clock)).rejects.toThrow(MembershipCapabilityDeniedError)
await expect(changeCompanyMemberRole(ownerContext, { membershipId: "owner_b", role: "ADMIN" }, core)).rejects.toThrow(ProtectedOwnerError)
```

Use two tenant fixtures and prove denied operations cause no repository mutation.

- [ ] **Step 2: Run and verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/application/company-memberships.test.ts`

Expected: FAIL because the application service does not exist.

- [ ] **Step 3: Implement authorization-before-mutation services**

Generate 32 random bytes as base64url, hash with SHA-256, persist only the hash and return `/invite/<plain-token>` once. Derive tenant from `AuthorizedCompanyContext`. Translate repository null/conflict results into explicit domain errors.

- [ ] **Step 4: Run and verify GREEN**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/application/company-memberships.test.ts`

Expected: role matrix, token lifecycle, two-tenant denial and mutation cases pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/seumeiapp/src/application/company-memberships.ts apps/seumeiapp/src/application/company-memberships.test.ts apps/seumeiapp/src/application/composition.ts
git commit -m "feat(seumei): authorize membership administration"
```

### Task 5: Add presenters and HTTP boundaries

**Files:**
- Create: `apps/seumeiapp/src/ui/presenters/membership.presenter.ts`
- Create: `apps/seumeiapp/src/ui/presenters/membership.presenter.test.ts`
- Create: `apps/seumeiapp/src/http/membership-handlers.ts`
- Create: `apps/seumeiapp/src/http/membership-routes.test.ts`
- Create: `apps/seumeiapp/app/api/members/route.ts`
- Create: `apps/seumeiapp/app/api/members/invitations/route.ts`
- Create: `apps/seumeiapp/app/api/members/invitations/[invitationId]/route.ts`
- Create: `apps/seumeiapp/app/api/members/[membershipId]/route.ts`
- Create: `apps/seumeiapp/app/api/invitations/accept/route.ts`

**Interfaces:**
- Consumes: Task 4 services and existing session/active-company boundary.
- Produces: member-directory JSON, one-time share path, mutation outcomes and stable error mappings.

- [ ] **Step 1: Write presenter and route tests first**

Prove view models contain names, emails, localized role/status labels and allowed actions, but no tenant ID, token hash or Prisma row. HTTP tests reject any body containing `tenantId`, unknown roles and cross-tenant target IDs.

```ts
expect(result).toMatchObject({ status: 403, body: { error: "capability_forbidden" } })
expect(JSON.stringify(result.body)).not.toMatch(/tenant_a|tokenHash/)
```

- [ ] **Step 2: Run and verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/ui/presenters/membership.presenter.test.ts src/http/membership-routes.test.ts`

Expected: FAIL because presenters and handlers do not exist.

- [ ] **Step 3: Implement presenters, handlers and thin Next routes**

Reuse `withAuthenticatedSession` and active-company cookie parsing. Map invalid `400`, unauthenticated `401`, forbidden `403`, conflict `409`, expired/unusable `410`, unavailable `503` and unexpected `500`. Do not expose tenant identifiers.

- [ ] **Step 4: Run and verify GREEN**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/ui/presenters/membership.presenter.test.ts src/http/membership-routes.test.ts`

Expected: presenter and boundary suites pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/seumeiapp/src/ui/presenters/membership.presenter.ts apps/seumeiapp/src/ui/presenters/membership.presenter.test.ts apps/seumeiapp/src/http/membership-handlers.ts apps/seumeiapp/src/http/membership-routes.test.ts apps/seumeiapp/app/api/members apps/seumeiapp/app/api/invitations
git commit -m "feat(seumei): expose authorized membership APIs"
```

### Task 6: Build the persistent company shell and member directory

**Files:**
- Create: `apps/seumeiapp/src/ui/presenters/workspace-shell.presenter.ts`
- Create: `apps/seumeiapp/src/ui/presenters/workspace-shell.presenter.test.ts`
- Create: `apps/seumeiapp/src/ui/CompanyWorkspaceShell.tsx`
- Create: `apps/seumeiapp/src/ui/CompanyWorkspaceShell.test.tsx`
- Create: `apps/seumeiapp/src/ui/CompanyMembers.tsx`
- Create: `apps/seumeiapp/src/ui/CompanyMembers.test.tsx`
- Create: `apps/seumeiapp/app/workspace/layout.tsx`
- Create: `apps/seumeiapp/app/workspace/members/page.tsx`
- Modify: `apps/seumeiapp/app/workspace/page.tsx`
- Modify: `apps/seumeiapp/src/ui/CompanyWorkspace.tsx`
- Modify: `apps/seumeiapp/app/globals.css`

**Interfaces:**
- Consumes: authorized workspace and member-directory view models.
- Produces: responsive shell, role-aware navigation, directory/invite forms and member actions.

- [ ] **Step 1: Write failing UI behavior tests**

```tsx
render(<CompanyWorkspaceShell shell={ownerShell}>{children}</CompanyWorkspaceShell>)
expect(screen.getByRole("link", { name: "Membros" })).toBeVisible()

render(<CompanyWorkspaceShell shell={memberShell}>{children}</CompanyWorkspaceShell>)
expect(screen.queryByRole("link", { name: "Membros" })).toBeNull()
```

Prove form labels, keyboard-reachable controls, explicit copy-link message, admin role-option restriction and loading/error feedback.

- [ ] **Step 2: Run and verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/ui/presenters/workspace-shell.presenter.test.ts src/ui/CompanyWorkspaceShell.test.tsx src/ui/CompanyMembers.test.tsx`

Expected: FAIL because shell and members UI do not exist.

- [ ] **Step 3: Implement the minimal real UI**

Use public MatrizLib buttons/fields where available. The server layout resolves active company and role. The member page resolves the directory server-side; client controls call the membership APIs and `router.refresh()` only after persisted success. Use no local business persistence.

- [ ] **Step 4: Run and verify GREEN**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/ui/presenters/workspace-shell.presenter.test.ts src/ui/CompanyWorkspaceShell.test.tsx src/ui/CompanyMembers.test.tsx`

Expected: responsive semantic shell and member interactions pass component tests.

- [ ] **Step 5: Commit**

```powershell
git add apps/seumeiapp/src/ui apps/seumeiapp/app/workspace apps/seumeiapp/app/globals.css
git commit -m "feat(seumei): deliver company membership shell"
```

### Task 7: Complete signed-out invitation return and acceptance UI

**Files:**
- Create: `apps/seumeiapp/src/application/safe-return-path.ts`
- Create: `apps/seumeiapp/src/application/safe-return-path.test.ts`
- Create: `apps/seumeiapp/src/ui/InvitationAcceptance.tsx`
- Create: `apps/seumeiapp/src/ui/InvitationAcceptance.test.tsx`
- Create: `apps/seumeiapp/app/invite/[token]/page.tsx`
- Modify: `apps/seumeiapp/app/login/page.tsx`
- Modify: `apps/seumeiapp/src/ui/AuthShell.tsx`
- Modify: `apps/seumeiapp/src/application/active-company.ts`

**Interfaces:**
- Consumes: invitation read/accept services and active-company cookie contract.
- Produces: safe same-origin login return, invitation preview/acceptance and authorized workspace redirect.

- [ ] **Step 1: Write failing redirect and acceptance tests**

```ts
expect(safeReturnPath("/invite/abc_123")).toBe("/invite/abc_123")
expect(safeReturnPath("https://evil.example/invite/abc")).toBe("/")
expect(safeReturnPath("//evil.example/invite/abc")).toBe("/")
```

Component tests prove wrong-email/expired states do not offer acceptance and successful acceptance navigates only after the persisted API result.

- [ ] **Step 2: Run and verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/application/safe-return-path.test.ts src/ui/InvitationAcceptance.test.tsx`

Expected: FAIL because the safe return and acceptance component do not exist.

- [ ] **Step 3: Implement safe return and invitation page**

Allow only single-leading-slash local paths and specifically preserve the invite route. Pass the validated path into `SharedLoginFlow`. On acceptance, set the active-company preference server-side from the accepted membership result; never trust a company or tenant supplied by the client.

- [ ] **Step 4: Run and verify GREEN**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/application/safe-return-path.test.ts src/ui/InvitationAcceptance.test.tsx`

Expected: safe redirect and invitation journey tests pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/seumeiapp/src/application/safe-return-path.ts apps/seumeiapp/src/application/safe-return-path.test.ts apps/seumeiapp/src/ui/InvitationAcceptance.tsx apps/seumeiapp/src/ui/InvitationAcceptance.test.tsx apps/seumeiapp/app/invite apps/seumeiapp/app/login/page.tsx apps/seumeiapp/src/ui/AuthShell.tsx apps/seumeiapp/src/application/active-company.ts
git commit -m "feat(seumei): complete secure invitation acceptance"
```

### Task 8: Publish only the completed surface and run scoped gates

**Files:**
- Modify: `apps/seumeiapp/src/manifest/manifest.ts`
- Modify: `apps/seumeiapp/src/manifest/manifest.test.ts`
- Modify: `apps/seumeiapp/README.md`
- Modify: `apps/seumeiapp/docs/AGENT-START-HERE.md`
- Modify: `docs/seumei-migration-ledger.md`
- Modify: `docs/DECISION-LOG.md` only if an architectural correction was necessary.

**Interfaces:**
- Consumes: the proven routes/capabilities from Tasks 1–7.
- Produces: truthful public manifest and continuation documentation.

- [ ] **Step 1: Update the manifest test first**

Expect `/workspace/members` and the implemented membership read/invite/manage capabilities, while continuing to reject product/stock/order placeholders.

- [ ] **Step 2: Run and verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/manifest/manifest.test.ts`

Expected: FAIL until the manifest advertises the real surface.

- [ ] **Step 3: Update manifest and documentation**

Mark memberships assimilated only after all focused suites pass. Record manual-link delivery, immutable owners and the next recommended catalog slice.

- [ ] **Step 4: Run scoped gates**

```powershell
corepack pnpm --filter @matriz/app-seumei test
corepack pnpm --filter @matriz/app-seumei lint
corepack pnpm --filter @matriz/app-seumei typecheck
corepack pnpm --filter @matriz/app-seumei build
corepack pnpm run test:smoke
corepack pnpm run prisma:validate
```

Expected: every command exits zero consecutively.

- [ ] **Step 5: Commit**

```powershell
git add apps/seumeiapp/src/manifest apps/seumeiapp/README.md apps/seumeiapp/docs/AGENT-START-HERE.md docs/seumei-migration-ledger.md docs/DECISION-LOG.md
git commit -m "docs(seumei): record membership assimilation"
```

### Task 9: Validate real database and browser journeys

**Files:**
- Modify only files implicated by a reproduced failure, always after adding a failing regression test.

**Interfaces:**
- Consumes: committed application and additive Core migration.
- Produces: real PostgreSQL/browser evidence and regression fixes.

- [ ] **Step 1: Validate the migration on a disposable PostgreSQL database**

Apply Core and Seumei schemas plus the new migration to a disposable local cluster. Verify invitation table constraints, token hash storage and membership acceptance persistence. Never target a user database.

- [ ] **Step 2: Start Hub and Seumei and exercise the complete browser flow**

Use real headed Playwright sessions for owner and invited users. Cover owner/admin/member/viewer policy, invite share path, signed-out login return, wrong email, acceptance, refresh, new session, role update/removal, direct forbidden route, tenant A/B known-ID attempts, desktop/mobile, focus, console and overflow.

- [ ] **Step 3: Fix reproduced failures through strict TDD**

For each failure: add a focused test that fails for the observed reason, make the smallest correct change, rerun focused and affected gates, with at most five correction rounds per failure group.

- [ ] **Step 4: Commit browser-discovered corrections**

Stage the new failing regression test and only the production files changed to
make that test pass, then commit them as `fix(seumei): harden membership
browser flow`. Skip this commit when no correction was required.

### Task 10: Run global verification and close the branch state

**Files:**
- No product edits unless a gate exposes a reproduced regression.

**Interfaces:**
- Consumes: committed slice.
- Produces: clean worktree and final evidence.

- [ ] **Step 1: Run all global gates required by Core schema and manifest changes**

```powershell
corepack pnpm exec turbo run lint --concurrency=4 --output-logs=errors-only
corepack pnpm exec turbo run typecheck --concurrency=4 --output-logs=errors-only
corepack pnpm exec turbo run build --concurrency=1 --output-logs=errors-only
```

- [ ] **Step 2: Audit the committed state**

```powershell
git diff --check
git status --short --branch
git ls-files | rg "(^|/)(\.env($|\.)|\.next/|\.turbo/|\.playwright-cli/|postgres\.log$)"
```

Expected: clean branch; only intentional `.env.example` files may match.

- [ ] **Step 3: Stop disposable services and remove or safely quarantine external temporary artifacts**

Verify exact resolved paths before any recursive cleanup. Confirm ports `3000`, `3008` and the disposable PostgreSQL port have no listeners.

- [ ] **Step 4: Report final evidence and next slice**

Summarize decisions, migration, isolation evidence, browser journey, gate counts, commits, risks and recommend products/catalog only after the role shell remains green.
