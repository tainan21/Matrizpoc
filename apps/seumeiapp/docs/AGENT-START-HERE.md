# Seumei — Agent Start Here

`apps/seumeiapp` is the permanent Seumei product (`appId: seumei`, package `@matriz/app-seumei`, port `3008`). It is web-first and owns its business domain locally.

## Current route flow

`/login` → `/` company selection/creation → `/onboarding` → `/workspace`.

- `/` lists the intersection of Core memberships and Seumei companies.
- `/onboarding` resumes persisted progress for the validated active company.
- `/workspace` requires both membership and completed onboarding.
- The `seumei_active_company` HTTP-only cookie is a preference, never authority.

## Ownership and layers

- Core owns user, tenant, app registration and membership. Access it through `CoreAccessRepository` and `@matriz/platform-db/core`.
- `prisma/schemas/seumei.prisma` owns company, onboarding and Seumei preferences. Access it through `CompanyRepository` and `@matriz/platform-db/seumei`.
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

Company shell, membership invitations and role capabilities (OWNER, ADMIN, MEMBER, VIEWER), keeping Core as membership authority. Products/catalog follow only after that shell is proven.
