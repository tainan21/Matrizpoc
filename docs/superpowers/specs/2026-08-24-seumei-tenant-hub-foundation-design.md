# Seumei Tenant Hub Foundation Design

## Objective

Deliver the first production-oriented Seumei vertical slice after authentication:
an authenticated user enters a Business OS Hub, sees only companies backed by
valid memberships, switches company safely, and opens only Seumei capabilities
installed and authorized for that company.

This slice establishes the tenant boundary required by later Catalog, Store,
Orders, Dashboard, and CRM work. It does not implement those business domains.

## Scope

This slice includes:

- a trusted Seumei tenant context resolved from the authenticated session;
- Galáxia Burger and Matriz Labs fixtures with independent memberships and apps;
- app-local Company, Membership, InstalledApp, and UserAppearancePreference models;
- centralized app-access policies;
- an internal typed registry for Seumei capabilities;
- tenant-bound repositories and application services;
- a high-fidelity authenticated Hub and shared shell foundation;
- company switching that changes operational scope without changing user appearance;
- a one-click Seumei demo account for deterministic tests and daily product use;
- isolation, authorization, shell interaction, and responsive tests;
- correction of the scoped React type mismatch blocking Seumei typecheck.

This slice excludes:

- Products, Customers, Orders, Store, Inventory, Finance, and Marketing entities;
- public storefront routes;
- arbitrary theming or storefront theme builders;
- a generalized plugin framework;
- changes to the accepted login design;
- Tauri-specific behavior beyond defining a platform-neutral boundary where needed.

## Existing Architecture to Preserve

The implementation preserves these structurally sound pieces:

- `@matriz/platform-auth` as the authenticated identity/session authority;
- `@matriz/access-tenants` types where they are safe, without trusting its
  arbitrary client-side selector as authorization;
- app-local domain, application, repository, mock, presenter, and bootstrap layers;
- `apps/seumei/src/manifest/manifest.ts` as the Matriz ecosystem manifest;
- MatrizLib public exports from `@matriz/design-ui` and `@matriz/design-system`;
- the Contracts gateway and establishment domain, isolated as legacy operational
  behavior until a later migration explicitly changes it;
- the Seumei Prisma schema as the app persistence boundary.

No Seumei business entity moves to `packages/*` in this slice.

## Domain Boundaries

### Identity

Owned by the shared auth platform. Seumei consumes `AuthSession` and never
duplicates credentials or sign-in state.

### Companies

Owns Company identity inside Seumei: id, slug, legal/display name, status,
contact data, and company branding. A Company corresponds to an operational
tenant for this phase.

### Memberships and Authorization

Owns the association between User and Company, including membership id, role,
and explicit permissions. Authorization policies consume a resolved membership;
UI components do not compare role strings directly.

Initial roles are `owner`, `admin`, `member`, and `guest`. Permissions remain
explicit strings so later policy changes do not require component rewrites.

### Applications

Owns two distinct concepts:

- `SeumeiAppDefinition`: a code-owned registry entry describing a Seumei
  capability such as CRM, Products, Orders, Inventory, Finance, or Store;
- `InstalledApp`: tenant-owned state recording which definitions are enabled
  for a company.

This registry is app-local and distinct from the Matriz monorepo app registry.
It is intentionally typed and small, not a plugin framework.

### Preferences and Appearance

Three independent concepts are maintained:

- `UserAppearancePreference`, keyed by user and portable across companies;
- `CompanyBranding`, owned by Company and used in authenticated operations;
- future `StoreAppearance`, owned by Store and not introduced in this slice.

Changing company does not overwrite the user's appearance preference.

### Platform and Shell

Owns reusable authenticated layout behavior: intelligent topbar, contextual
sidebar, app switcher, company switcher, keyboard/touch affordances, and app
contribution contracts. Feature pages contribute navigation and contextual
actions; they do not render independent topbars.

## Trusted Tenant Resolution

Seumei introduces an app-local immutable context:

```ts
interface SeumeiTenantContext {
  readonly userId: UserId
  readonly companyId: CompanyId
  readonly membershipId: MembershipId
  readonly role: MembershipRole
  readonly permissions: readonly SeumeiPermission[]
}
```

Resolution follows:

```text
AuthSession
  -> validate requested active company against session tenant access
  -> load matching Seumei membership
  -> reject missing, disabled, or mismatched membership
  -> return immutable SeumeiTenantContext
```

The requested company id is only a selection hint. It never grants access.

The resolver fails closed with typed errors:

- `authentication-required`;
- `company-not-found`;
- `membership-required`;
- `membership-disabled`;
- `app-not-installed`;
- `permission-denied`.

Pages translate these errors through presenters into safe redirects or clear UI
states. Internal ids or other tenant data are not disclosed in error messages.

## Repository and Application-Service Rules

Tenant-owned repository operations accept `SeumeiTenantContext`, not a raw
`companyId` supplied by a component.

```ts
interface CompanyRepository {
  listForUser(userId: UserId): Promise<readonly Company[]>
  getCurrent(context: SeumeiTenantContext): Promise<Company | null>
}

interface InstalledAppRepository {
  list(context: SeumeiTenantContext): Promise<readonly InstalledApp[]>
  get(context: SeumeiTenantContext, appId: SeumeiAppId): Promise<InstalledApp | null>
}
```

Mutation repositories introduced in later slices must compare both entity id
and `context.companyId`. No global `getAll()` surface is exposed.

Fixtures may be stored in one backing collection for test convenience, but only
repository-private helpers can access it. Application services and UI receive
tenant-filtered results.

## Fixture Model

### Demo Account

Seumei exposes `demo@seumei.local` as its canonical local demo account. The
login shortcut still creates a normal authenticated session through the shared
auth broker. Seumei then resolves that authenticated user to explicit fixture
memberships; the shortcut never bypasses authentication or tenant resolution.

Only the canonical demo account receives the demo fixture memberships. Other
authenticated accounts start with no Seumei companies until memberships are
created for them. Tests inject the authenticated demo user id into the same
fixture factory used by runtime, so test convenience cannot broaden repository
access.

### Galáxia Burger

- active company;
- Tai as owner;
- CRM, Products, Orders, Inventory, Finance, and Store installed;
- purple company accent and fixture-provided logo/imagery references.

### Matriz Labs

- active company;
- Tai as admin or member with a smaller permission set;
- Dashboard, CRM, Products, and Reports installed;
- independent branding and no Galáxia Burger data references.

All names, apps, colors, logos, and content come from fixture modules. Feature
and shell code contains no `Galáxia Burger` conditionals.

## Routes

The accepted login remains `/login`.

Authenticated routing becomes:

- `/` redirects to the current valid company Hub or company selection;
- `/hub` lists memberships and installed capabilities;
- `/c/[companySlug]` is the company operational entry surface;
- `/c/[companySlug]/apps/[appId]` is the typed capability entry placeholder
  used only to prove route authorization in this slice.

The dynamic company route resolves the slug to a company and then validates
membership. A slug alone never establishes tenant access.

Later business routes will nest under this company scope without changing the
tenant-resolution contract.

## Shared Shell Design

The Hub and company routes share one Seumei shell.

### Desktop

- dark graphite surfaces with restrained purple accent;
- compact topbar with Seumei identity, search/command entry, app switcher,
  company context, notifications, and user access;
- contextual sidebar showing current company, active capability, and routes;
- compact resting state and deliberate reveal through pointer proximity,
  focus-within, or explicit toggle;
- reveal does not close while controls contain focus or active interaction;
- reduced-motion users receive state changes without animated travel.

### Keyboard and Touch

- all hover-revealed features are reachable with focus;
- explicit toggles expose topbar/sidebar controls;
- escape closes transient panels and returns focus to the trigger;
- touch layouts use persistent explicit controls rather than hover assumptions.

### Responsive

- large desktop uses the compact intelligent shell from the references;
- smaller desktop keeps company and active app context visible;
- tablet collapses contextual navigation behind an explicit control;
- mobile Hub uses stacked company/app cards and a stable bottom action region;
- no uncontrolled horizontal clipping is allowed.

## MatrizLib Integration

The slice uses existing public MatrizLib primitives for buttons, forms, badges,
surfaces, typography, feedback, focus behavior, and theme control where their
contracts fit.

Seumei-specific compositions such as the company card, capability tile,
intelligent topbar, and contextual sidebar remain app-local. A primitive is not
added to MatrizLib until a second real app consumer and stable public contract
exist.

The Seumei shell may wrap MatrizLib primitives to implement product-specific
geometry and visual language; it does not clone their base behavior.

## Application Data Flow

```text
AuthProvider
  -> Seumei tenant resolver
  -> immutable TenantContext
  -> policy-protected application service
  -> tenant-bound repository
  -> domain result
  -> presenter
  -> Hub/Shell view model
```

Company switching requests a company from the user's known membership list,
resolves a new context, replaces the operational view model, and preserves the
user preference model. Invalid selections leave the prior valid context intact
and display a safe error.

## Testing Strategy

### Domain and Application Tests

- context resolution succeeds for a valid membership;
- arbitrary company ids without membership are rejected;
- disabled memberships are rejected;
- role-to-permission policy is centralized and deterministic;
- app access requires both installation and permission;
- Galáxia Burger and Matriz Labs installed apps never mix;
- switching companies replaces company-scoped data but preserves user appearance.

### Repository Isolation Tests

- Company A cannot list Company B installed apps;
- a context whose membership and company do not match is rejected;
- tenant-bound lookups do not fall back to global fixtures;
- future mutation helpers are structured to require context and ownership checks.

### UI and Shell Tests

- Hub shows only authenticated memberships;
- company cards and app tiles come from view models;
- unauthorized app routes render a safe denied state or redirect;
- sidebar and topbar reveal through focus and explicit toggles;
- critical navigation remains operable without hover;
- reduced-motion behavior disables reveal transitions;
- responsive layouts have stable primary actions.

### Validation Commands

Scoped checks are mandatory:

```text
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei lint
pnpm --filter @matriz/app-seumei dev
```

If the Seumei manifest or a public shared contract changes, also run:

```text
pnpm test:smoke
```

The running app must be visually inspected at desktop, smaller desktop, tablet,
and mobile widths against the supplied Hub and shell references.

## Implementation Sequence

1. Repair the scoped React type mismatch so Seumei has a trustworthy baseline.
2. Introduce app-local ids, Company, Membership, InstalledApp, and preference models.
3. Add the tenant resolver, policies, and typed failure results with tests.
4. Add independent Galáxia Burger and Matriz Labs fixtures.
5. Add tenant-bound repositories and application services with isolation tests.
6. Add the internal Seumei application registry and authorization tests.
7. Add Hub and shell presenters/view models.
8. Implement authenticated routes and company switching.
9. Add the one-click demo login adapter without changing shared auth contracts.
10. Implement the intelligent shell interactions and responsive behavior.
11. Run scoped checks, run the app, inspect references, and correct visible deviations.

## Architectural Risks and Controls

- **Confusing Matriz apps with Seumei capabilities:** use separate branded ids
  and an app-local registry.
- **Client selection becoming authorization:** resolve every selection against
  authenticated membership before repository access.
- **Package pollution:** keep Seumei domain and shell compositions app-local.
- **Legacy establishment coupling:** leave the legacy domain operational but
  outside the new Company and Membership modules.
- **Fixture leakage:** expose fixtures only through repositories and presenters.
- **Premature persistence redesign:** establish repository contracts and tests
  first; Prisma adapters can replace mocks without changing UI.
- **Visual divergence:** compare the running Hub and shell at target widths,
  focusing on geometry, spacing, density, contrast, focus, and reveal states.

## Completion Criteria

This slice is complete only when:

- Tai can enter a Hub containing Galáxia Burger and Matriz Labs;
- `demo@seumei.local` can enter through one explicit demo action and receives
  only its fixture-backed memberships;
- each company shows only its installed and authorized capabilities;
- direct navigation to an unauthorized company or app fails closed;
- switching company changes all company-scoped Hub and shell data;
- Tai's appearance preference remains unchanged;
- tenant isolation tests pass for both fixture companies;
- the shell is usable with mouse, keyboard, focus, touch, and reduced motion;
- scoped tests, typecheck, and lint pass;
- the running desktop and responsive surfaces have been visually reviewed
  against the approved Seumei references.
