# Seumei Company Shell, Memberships and Permissions Design

**Date:** 2026-08-20  
**Status:** Implemented and verified on 2026-08-20  
**Scope:** `apps/seumeiapp`, the Core Prisma schema/migration required for membership invitations, and truthful Seumei documentation/manifest updates

## Context

The first assimilated Seumei slice already creates a Core tenant, an app-scoped `OWNER` membership and a Seumei company, then persists onboarding and opens a server-authorized workspace. The next product capability must make that workspace durable enough to host future catalog, stock and commerce slices.

The external reference demonstrates a workspace shell, a role matrix and route gates. Its membership list, role switcher and permissions repository are browser-local mocks backed by seed data and `localStorage`. The journey and role vocabulary are useful; its authority and persistence model are not.

Core already owns `User`, `Tenant`, `Membership`, `MembershipRole` and `AppRegistration`. Seumei already intersects Core memberships with Seumei companies and never accepts a browser-supplied tenant as authority.

## Goal

Deliver a real company shell with membership invitations and role-based capabilities so that an authorized operator can invite and administer colleagues, an invited authenticated user can join the correct company, and non-administrative roles are denied administrative reads and mutations by construction.

The vertical journey is:

```text
OWNER/ADMIN opens company workspace
  -> opens Members
  -> creates an expiring invitation
  -> shares the generated link
  -> invited user authenticates with the invited email
  -> accepts invitation
  -> receives a persisted Core membership
  -> enters the authorized Seumei workspace
  -> role gates remain effective after refresh and a new session
```

## Non-goals

- Sending email or integrating an email provider without credentials.
- Custom roles or per-user capability overrides.
- Ownership transfer, owner demotion or owner removal.
- Product, stock, store or order placeholder pages.
- Moving Seumei permissions into `packages/access/permissions`.
- Giving Matriz Admin direct access to Seumei or Core membership tables.
- Treating a share link, cookie, route parameter or client state as tenant authority.

## Evidence and assimilation decision

The reference files `features/permissions/**`, `features/space-settings/presentation/space-members-settings-section.tsx` and `features/space-runtime/application/space-route-access.ts` show:

- a useful workspace membership directory;
- the roles `owner`, `admin`, `editor`, `member` and `viewer`;
- action-based permission decisions and read-only route outcomes;
- a role switcher and member list fed by static seeds and `localStorage`.

The canonical Core model has `OWNER`, `ADMIN`, `MEMBER` and `VIEWER`, so the unsupported reference-only `editor` role will not be preserved. The permission-decision shape will be adapted into app-local pure functions. The local repository, mock identity, role preview switcher and browser persistence will be replaced.

Classification: **ADAPTAR / P1** for the journey and role decisions; **SUBSTITUIR / P0** for storage and authority; **NÃO ASSIMILAR / P3** for the mock role switcher.

## Architectural decision

### Core owns invitation lifecycle

Add a generic, app-scoped `MembershipInvitation` model to `prisma/schemas/core.prisma`. An invitation belongs to a tenant and app, targets a normalized email and role, records its inviter, stores only a token hash, expires, and has an explicit lifecycle.

The model will include:

- `id`, `tenantId`, `appId`;
- normalized `email` and `role`;
- unique `tokenHash`;
- `status`: `PENDING`, `ACCEPTED` or `REVOKED`;
- `invitedByUserId`, optional `acceptedByUserId`;
- `expiresAt`, `acceptedAt`, `revokedAt`, `createdAt`, `updatedAt`;
- a uniqueness constraint on `(tenantId, appId, email)` so re-inviting rotates and resets the same logical invitation instead of creating simultaneous active grants.

The Core migration is additive. Existing tenants, users and memberships are unchanged.

Acceptance occurs in one Core transaction: resolve the hash, require `PENDING`, require a non-expired invitation, compare the authenticated user's normalized email, verify the app registration remains enabled, upsert the membership, and mark the invitation accepted. Replays return an idempotent accepted result only for the same accepted user; every other replay is denied.

### Seumei owns role policy

Seumei defines a small app-local capability vocabulary and pure role matrix. It does not extend a shared package because there is only one real consumer and the capability names carry Seumei product semantics.

Initial capabilities:

| Capability | OWNER | ADMIN | MEMBER | VIEWER |
| --- | --- | --- | --- | --- |
| `workspace.read` | yes | yes | yes | yes |
| `members.read` | yes | yes | no | no |
| `members.invite.admin` | yes | no | no | no |
| `members.invite.standard` | yes | yes | no | no |
| `members.role.manage.admin` | yes | no | no | no |
| `members.role.manage.standard` | yes | yes | no | no |
| `members.remove.admin` | yes | no | no | no |
| `members.remove.standard` | yes | yes | no | no |

`standard` means `MEMBER` or `VIEWER`. Owners may manage `ADMIN`, `MEMBER` and `VIEWER`; administrators may manage only `MEMBER` and `VIEWER`. Neither role may mutate an `OWNER`. Invitations cannot grant `OWNER` in this slice.

The application service evaluates capabilities after resolving the active company and the actor's persisted membership. UI visibility is convenience only; every server mutation repeats the authorization decision.

### Application-local Core adapter

`CoreAccessRepository` grows explicit tenant-scoped membership operations rather than exposing a generic Core client:

- list company members for an already authorized tenant;
- list pending invitations for that tenant and app;
- create or rotate an invitation;
- revoke a pending invitation;
- accept an invitation by token hash and authenticated identity;
- change a non-owner membership role;
- remove a non-owner membership.

Every administrative method receives the tenant derived from the authorized company context. Lookup by invitation token is the sole exception: the high-entropy bearer token locates the invitation, after which email, status, expiry, app registration and authenticated identity are checked before membership creation. Plain tokens never enter persistence, logs, list responses or telemetry.

## HTTP boundaries

The app adds these app-local routes:

- `GET /api/members`: list authorized company members and pending invitations.
- `POST /api/members/invitations`: create or rotate an invitation and return its one-time share path.
- `DELETE /api/members/invitations/[invitationId]`: revoke a pending invitation.
- `PATCH /api/members/[membershipId]`: change an allowed non-owner role.
- `DELETE /api/members/[membershipId]`: remove an allowed non-owner membership.
- `POST /api/invitations/accept`: accept a token using the authenticated session identity.

Administrative routes do not accept `tenantId`. They resolve the active company cookie, validate membership, derive the tenant and then query or mutate within that tenant. Known IDs from another tenant return the same generic forbidden/not-found boundary and reveal no company, member or invitation data.

Invitation creation returns a relative `sharePath`, not an absolute environment-specific URL. The client can copy the link using the current origin. Pending-invitation lists omit token material.

Expected errors are explicit: invalid input `400`, unauthenticated `401`, forbidden `403`, expired or unusable invitation `410`, conflict `409`, unavailable dependency `503`, and unexpected failure `500`.

## UI and navigation

`/workspace` gains a persistent server-rendered shell containing:

- Seumei identity and active company;
- the actor's role label;
- Overview navigation for every authorized role;
- Members navigation only for `OWNER` and `ADMIN`;
- company switching and session exit paths already supported by the app.

`/workspace/members` shows the real member directory and pending invitations. It provides role-appropriate invitation and management controls. Member and viewer direct navigation is denied server-side, not rendered as an empty page.

`/invite/[token]` shows invitation metadata only after token validation and does not expose tenant identifiers. A signed-out visitor is sent to `/login?returnTo=/invite/[token]`. The Seumei login page accepts only safe same-origin relative return paths, preventing open redirects. After authenticated acceptance, the company becomes the active preference and the user is sent to its workspace.

Without an email provider, successful invitation creation states that no email was sent and offers a copyable secure link. This is an honest product state, not a simulated delivery.

All UI consumes presenters/view models. Raw Core membership rows, tenant IDs and token hashes never cross into client components.

## Concurrency and invariants

- Invitation creation normalizes email and rotates a previous logical invite atomically.
- Existing members cannot receive another pending invitation for the same app and tenant.
- Acceptance is transactional and idempotent for the same invited user.
- Expired, revoked, wrong-email and wrong-app invitations never create membership.
- Membership changes target `(membershipId, tenantId, appId)` and never query then filter in the UI.
- Owners are immutable in this slice.
- An administrator cannot create, promote, demote or remove an administrator.
- Removing a membership invalidates access on the next server request and refresh.
- Cache keys, if introduced, must include actor and tenant context; this slice does not require a cross-request cache.

## Testing strategy

Implementation follows strict red-green-refactor cycles.

Domain tests prove the complete role/capability matrix and owner invariants. Application tests prove authorization before repository mutation. Repository contract tests assert tenant/app scope in every Core query and transaction. HTTP tests reject browser `tenantId`, malformed roles, cross-tenant IDs and token replays.

Negative tests use at least two tenants with known company, membership and invitation IDs. They prove:

- MEMBER and VIEWER cannot list or administer members;
- ADMIN cannot manage ADMIN or OWNER;
- OWNER cannot mutate OWNER;
- tenant A cannot read, change, revoke or accept resources from tenant B through administrative routes;
- a token presented by the wrong authenticated email is denied;
- expired and revoked tokens create no membership;
- removed users lose workspace access after refresh.

Browser validation covers desktop and mobile, keyboard/focus, invitation creation and copy feedback, signed-out return path, acceptance, role update, access removal, refresh/new session, console errors and overflow.

Required gates are the scoped Seumei suite, Hub checks affected by authentication return flow if touched, smoke tests, Prisma validation and all global gates required by the Core schema/migration and manifest changes.

## Documentation and public surface

Before domain code, update `docs/seumei-migration-ledger.md` with the refined evidence, destination, test strategy and in-progress state. After the vertical flow is proven, mark the capability assimilated and document residual limitations.

The Seumei manifest adds only implemented membership routes and capabilities. It does not advertise future catalog or custom-role capabilities. README and `AGENT-START-HERE.md` describe invitation authority, role policy and the next safe continuation point.

## Risks and mitigations

- **Share-link leakage:** store only a hash, use high entropy, short expiry, one logical active invite and no token logging.
- **Email delivery absent:** present a manual share link and explicit delivery state; do not invent credentials or success.
- **Core ownership expansion:** keep the model generic and app-scoped, migration additive and all policy semantics inside Seumei.
- **Privilege escalation:** prohibit `OWNER` grants, make `ADMIN` management asymmetric and verify policy again within every mutation service.
- **Stale UI after membership removal:** authorize every page and API request from persisted Core state; client state never grants continuity.

## Success criteria

The slice is complete when:

1. an owner can invite `ADMIN`, `MEMBER` or `VIEWER` with persisted expiry;
2. an admin can invite only `MEMBER` or `VIEWER`;
3. the invited authenticated email can accept and enter the correct workspace;
4. another email, expired token, revoked token or replay cannot grant access;
5. owners remain protected from demotion/removal;
6. role changes and removal take effect after refresh and a new session;
7. member and viewer administrative access is denied;
8. two-tenant negative tests prove isolation with known IDs;
9. the shell, member directory and invitation journey work on desktop and mobile;
10. ledger, schema migration, manifest, documentation, tests and committed gates describe the same real capability.

## Verification record

- Seumei: 26 test files and 137 tests passed; scoped lint, typecheck and production build passed.
- Monorepo: 23 smoke files and 154 tests passed; global lint (37 tasks), typecheck (37 tasks) and build (10 tasks) passed.
- Prisma: all six schemas validated; the additive Core migration applied successfully over the pre-slice Core schema in disposable PostgreSQL.
- Browser: OWNER created two companies, resumed and completed onboarding, invited a VIEWER, and changed the accepted role to MEMBER. Wrong-email acceptance was denied; VIEWER and MEMBER administrative mutations returned 403; selecting the known company ID from the other tenant returned 403.
- Persistence: the accepted invitation retained a 64-character hash and no plaintext token row; memberships persisted across refresh and a new browser session.
- UX: desktop and 390 × 844 mobile flows were exercised, keyboard focus remained visible, document width matched viewport width and browser console errors were limited to deliberately exercised 403 responses.
