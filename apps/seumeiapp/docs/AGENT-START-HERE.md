# Seumei — Agent Start Here

`apps/seumeiapp` is the permanent Seumei product (`appId: seumei`, package `@matriz/app-seumei`, port `3008`). It is web-first and owns its business domain locally.

## Current route flow

`/login` → `/` company selection/creation → `/onboarding` → `/workspace` → `/workspace/products` or `/workspace/members`.

An invited identity follows `/invite/[token]` → `/login?returnTo=...` when signed out → authenticated acceptance → `/workspace`.

- `/` lists the intersection of Core memberships and Seumei companies.
- `/onboarding` resumes persisted progress for the validated active company.
- `/workspace` requires both membership and completed onboarding.
- `/workspace/members` exposes only actions allowed by the server-side OWNER/ADMIN/MEMBER/VIEWER capability policy.
- `/invite/[token]` binds acceptance to the authenticated e-mail; the Core transaction claims the invitation before upserting membership.
- `/workspace/products` reads tenant-scoped categories/products; `/new` and `/[productId]` author relational variants with optimistic versioning.
- `/docs` documents canonical route flows and offers a temporary local scratchpad. Remove it before launch without a schema migration.
- The `seumei_active_company` HTTP-only cookie is a preference, never authority.

## Ownership and layers

- Core owns user, tenant, app registration, membership and invitation persistence. Read access uses `CoreAccessRepository`; team mutations use the segregated `CoreMembershipRepository` through `@matriz/platform-db/core`.
- `prisma/schemas/seumei.prisma` owns company, onboarding, Seumei preferences and catalog. Access it through `CompanyRepository`/`CatalogRepository` and `@matriz/platform-db/seumei`.
- Domain and application rules stay under `src/domain` and `src/application`.
- Prisma implementations stay under `src/infrastructure`; never add an unscoped company lookup.
- Routes and server pages derive the actor from the Hub session, resolve the persistent Core user, then validate membership.
- UI receives app-local presenter view models. Never pass raw domain entities or tenant IDs to client components.
- Use public MatrizLib exports; company-specific composition remains here.

## Change checklist

1. Update `docs/seumei-migration-ledger.md` before assimilating a new reference capability.
2. Write a failing behavior/authorization test first.
3. Include tenant scope in model, repository signature, query and negative tests.
4. Represent empty, unavailable, conflict and forbidden states honestly.
5. Update the manifest only for routes/capabilities that work end to end.
6. Validate desktop/mobile, keyboard/focus, refresh, console and tenant A versus B.

Do not import other apps' internals, create a second Prisma client/config system, persist business state in local storage, or add future placeholder pages.

## Next recommended slice

Stock items and append-only movements connected to persisted product variants. Preserve tenant authority, add concurrency-safe balance rules and do not introduce store/publication placeholders.
