# Seumei Demo Federation and Restaurant Commerce Design

Date: 2026-08-24
Status: approved; implementation plans published

## Purpose

Deliver one coherent, persistent demonstration that starts at Matriz login, opens a membership-authorized MyHub portfolio, enters a company workspace, manages restaurant products and recipes, records ingredient stock, simulates a customer purchase, creates an order and proves the resulting customer and stock effects.

The release has three visual surfaces selected by the user:

1. MyHub Federation: authorized companies, public apps and cross-company BI.
2. Seumei Operations: live orders, operational metrics and ingredient risk.
3. Seumei Culinary: product imagery, recipe composition, ingredient quantities and derived availability.

These are not separate applications or duplicated themes. They are versioned experience presets over the same contracts, presenters, permissions and persisted data.

## Architectural boundaries

- `apps/seumeiapp` owns companies, catalog, images, ingredients, recipes, inventory, orders and customers.
- `prisma/schemas/seumei.prisma` owns all restaurant business persistence.
- `prisma/schemas/core.prisma` owns global identity, tenants, memberships and app registrations.
- MyHub never imports Seumei internals and never queries the Seumei database.
- MyHub consumes a versioned, authenticated Seumei portfolio API through an app-local gateway.
- Shared business data does not mean shared database access. Cross-app sharing is limited to identity, tenant references, memberships, app registrations, public DTOs, versioned APIs and authorized events.
- Browser commands never carry `tenantId` as authority. Company and tenant context are derived server-side from the authenticated actor and membership.
- Demo mode never grants authorization. Demo users receive ordinary persisted memberships to explicit demo tenants.

## Delivery decomposition

This umbrella design must be executed as three independently testable plans. Each plan ends in working software and no future route is added before its data and behavior exist.

### Slice A - Demo identity, MyHub Federation and experience presets

Provide an idempotent demo-provisioning command that creates:

- `demo.global@matriz.local`, owner of the two demo Seumei tenants and enrolled in every applicable registered web app through ordinary Core memberships/app registrations;
- `operacao@galaxiaburger.demo`, a restricted Galaxia Burger operator used to prove that global demo presentation does not bypass membership;
- tenant/company `Galaxia Burger`;
- tenant/company `Sabor & Brasa`.

The provisioner is explicit tooling, never an application startup side effect. Repeated execution converges without duplicating users, tenants, memberships or business records. It refuses to mutate a non-demo tenant with a colliding slug.

`demo.global@matriz.local` may show a demo marker in MyHub, resolved from environment-scoped demo configuration. That marker is presentational only. Authorization continues to use Core memberships and enabled app registrations.

MyHub root, after authentication, shows only companies visible to the actor. It aggregates authorized Seumei summaries and renders option 3: totals, company rows, public app availability and direct entry. Selecting a company uses the existing server-authoritative Seumei selection flow and redirects to its workspace.

Experience presets are app-local, code-defined and versioned:

- `federation-v1` for MyHub;
- `operations-v1` for operational Seumei routes;
- `culinary-v1` for product and recipe routes.

Presets select public tokens, layout composition and interaction density. They never store arbitrary CSS or create alternative domain implementations. New versions enter a typed registry and must retain accessibility and view-model contracts.

### Slice B - Product imagery, ingredients, recipes and stock

Extend real catalog products with ordered images and accessible alternative text. Demo images are original, app-owned assets stored under the Seumei public surface; no remote hotlink or placeholder is accepted.

Add restaurant ingredient and recipe persistence:

- `Ingredient`: tenant-owned reusable item with name, slug, optional SKU, base unit and active status.
- `Recipe`: tenant-owned recipe attached one-to-one to a sellable product variant, with version and yield quantity.
- `RecipeIngredient`: tenant-owned recipe line connecting one recipe to one ingredient and a positive integer quantity in the ingredient base unit.
- `IngredientInventory`: tenant-owned materialized balance, low-stock threshold and optimistic version for one ingredient.
- `IngredientStockMovement`: immutable signed movement with before/after balances, type, reason, notes, actor, idempotency key and timestamp.

Supported base units in the first release are `UNIT`, `GRAM` and `MILLILITER`. UI may format kilograms or liters, but persistence uses integers in the base unit. Floating-point quantities are forbidden.

The demo catalog contains complete fields and useful defaults, including Galaxia Smash, Galaxia Bacon, Galaxia Calabresa and supporting items. The reusable ingredient catalog includes at least brioche bun, beef blend, cheddar, calabresa, lettuce, tomato, house sauce and potatoes. Common items are seeded as ordinary tenant data and can be edited; they are not hard-coded UI options.

The culinary route opens from a real product/variant and renders option 2. It shows product image, description, price, active state, recipe lines, yield and derived producible quantity. Availability is the minimum whole-unit quotient across ingredient balances and required recipe quantities.

Stock movements support entry, exit and reconciliation. A transaction verifies tenant-scoped ingredient ownership, validates a non-zero delta, prevents negative balance, conditionally advances version and inserts its movement. Reused idempotency keys return the same result only for the same command identity.

### Slice C - Simulated storefront purchase, orders and customers

Expose a simple real storefront route for a published demo company. The primary route flow is:

`/login` -> MyHub `/` -> open authorized company -> Seumei `/workspace` -> `/store/[storeSlug]` -> product -> checkout -> success -> `/workspace/orders/[orderId]`.

The purchase simulation uses the same server contract a future payment/storefront adapter can call. It is labelled simulation and never claims a real payment. The browser submits product variant, quantity, customer fields and an idempotency key; it does not submit tenant authority, price totals or stock effects.

Persist:

- `Customer`: tenant-owned commercial identity with normalized contact fields and address/notes.
- `Order`: tenant-owned order number, channel, lifecycle, payment simulation state, fulfillment mode, totals in cents and idempotency identity.
- `OrderItem`: immutable product/title/image/price/recipe-version snapshot and quantity.
- `OrderTimelineEvent`: immutable operational history.
- `OrderStockConsumption`: relation between order item, ingredient and resulting stock movement.

Initial lifecycle is deliberately small: `PLACED`, `CONFIRMED`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`. Initial simulated payment state is `SIMULATED_CAPTURED`; it is not a production payment provider.

Order creation runs in one Seumei database transaction with serializable isolation and bounded retry for serialization conflicts:

1. Resolve published company and sellable variant server-side.
2. Read the current recipe version and required ingredients within the same tenant.
3. Recalculate price and total on the server.
4. Claim the tenant-scoped idempotency key.
5. Create or update the tenant customer using normalized contact evidence.
6. Create order and immutable item snapshot.
7. Conditionally decrement every ingredient without allowing negative balances.
8. Append immutable stock movements and consumption links.
9. Append the placed/payment timeline.
10. Commit all effects or none.

A repeated identical purchase returns the original order. A mismatched reuse conflicts. Insufficient stock, stale recipe, unpublished product, cross-tenant ID or invalid customer data creates no order, customer mutation or stock movement.

The operational route renders option 1 from persisted summaries: orders today, ticket average, pending orders and low-stock ingredients. It does not fabricate real-time connectors or third-party delivery channels.

## Public portfolio contract

Seumei exposes `GET /api/public/v1/portfolio` for an authenticated actor. It resolves the Core user and Seumei memberships, then returns summaries only for those tenant IDs.

Conceptual response:

```ts
type SeumeiPortfolioV1 = {
  generatedAt: string
  companies: Array<{
    companyId: string
    name: string
    slug: string
    status: "ONBOARDING" | "ACTIVE"
    role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
    todayRevenueCents: number
    liveOrderCount: number
    lowStockIngredientCount: number
    workspaceUrl: string
  }>
  totals: {
    companyCount: number
    todayRevenueCents: number
    liveOrderCount: number
    lowStockIngredientCount: number
  }
}
```

MyHub owns a gateway that forwards the authenticated session to this API. In local mock authentication, the HTTP-only session cookie is forwarded server-side. A production cross-service token/session exchange remains a named platform gap until implemented; local cookie forwarding must not be presented as the production trust model.

The DTO may enter `packages/integration/api-contracts` only because MyHub and Seumei are two real consumers and the surface is neutral, versioned and stable. No Seumei rule enters the package.

## Route inventory

Routes are introduced only with complete behavior:

- MyHub `/login`: existing login/first-use flow plus explicit demo profiles.
- MyHub `/`: authenticated portfolio and authorized app access.
- Seumei `/`: company create/select/retake flow remains canonical.
- Seumei `/workspace`: operations overview.
- Seumei `/workspace/products`: catalog with images and recipe availability.
- Seumei `/workspace/products/[productId]`: product editing.
- Seumei `/workspace/products/[productId]/recipe`: culinary recipe detail/editor.
- Seumei `/workspace/ingredients`: reusable ingredient catalog.
- Seumei `/workspace/stock`: ingredient balance and health.
- Seumei `/workspace/stock/[ingredientId]`: movement timeline and adjustment.
- Seumei `/workspace/orders`: operational order list.
- Seumei `/workspace/orders/[orderId]`: order, customer snapshot, timeline and consumption.
- Seumei `/workspace/customers`: customers derived from persisted commercial identities.
- Seumei `/workspace/customers/[customerId]`: customer details and orders.
- Seumei `/store/[storeSlug]`: demo storefront.
- Seumei `/store/[storeSlug]/checkout`: simulated checkout.
- Seumei `/store/[storeSlug]/checkout/success`: persisted receipt and workspace link for authorized operators.

## Authorization

Capabilities extend the existing role policy:

- all members: `portfolio.read`, `catalog.read`, `recipes.read`, `stock.read`, `orders.read`, `customers.read`;
- OWNER/ADMIN: catalog, recipe, stock and order management;
- MEMBER: order workflow actions allowed by policy, no membership or company configuration;
- VIEWER: read-only;
- public storefront: read published catalog and create idempotent orders only through the published company contract.

Authorization is evaluated before record lookup when possible. Missing IDs and known IDs from another tenant produce indistinguishable unavailable results.

## Honest states and accessibility

Every new surface has loading, empty, unavailable, forbidden, conflict, insufficient-stock and recoverable-error states. No permanent spinner or silent fake success is accepted.

The implementation fixes the prior high-priority visual findings before extending the same surfaces:

- onboarding save releases its pending state and exposes retryable error copy;
- product empty-state content and CTA no longer overlap.

Desktop and mobile must support keyboard focus, readable targets, no document overflow and measured contrast. The generated concepts are visual authorities, but final implementation uses existing Matriz components/tokens and real raster product images rather than copied pixels or handcrafted placeholder art.

## Demo data safety

- Demo provisioner runs only through an explicit command and requires a positive demo-mode flag.
- Demo slugs and emails are fixed and documented.
- It refuses to adopt or overwrite rows not marked by the deterministic demo identity set.
- Demo reset, if added, targets exact verified demo IDs and never scans/deletes tenants generically.
- Demo UI clearly labels simulated payment and isolated data.
- No demo credential, cookie, token or database URL enters Git.

## Multi-tenancy scorecard

The acceptance report scores the system with evidence, not sentiment. Each control receives `PASS = 1`, `PARTIAL = 0.5` or `FAIL = 0`; the weighted percentage is the sum below.

| Area | Weight | Required proof |
| --- | ---: | --- |
| Identity and session | 15 | Global identity cannot imply tenant access; expiry/restart/forgery behavior documented and tested |
| Membership and capabilities | 15 | App-scoped memberships and full role matrix including negative paths |
| Schema ownership and constraints | 15 | Explicit tenant ownership, unique/index/check constraints and additive migrations |
| Repositories, services and APIs | 20 | Tenant required by every business operation; no filter-after-read; server authority |
| Cross-app gateways and BI | 10 | Public versioned contract, authorized aggregation and no direct DB/internal imports |
| Cache, logs and observability | 10 | Tenant/user-aware keys and redacted structured context without sensitive payloads |
| Isolation, idempotency and concurrency tests | 10 | Tenant A/B known IDs, simultaneous stock/order writes and no partial effects |
| Deployment defense in depth | 5 | Database credentials/roles, production session exchange and RLS posture documented |

The product may claim `100%` only when every area passes and no critical isolation gap remains. The report must distinguish application-level tenant correctness from infrastructure defense in depth. Known current gaps likely include in-memory mock authentication, production gateway trust, absence of PostgreSQL RLS, unrestricted schema credentials and incomplete tenant-aware observability; evidence can improve or overturn these findings.

## Testing strategy

Follow strict TDD from schema contracts through domain rules, repositories, services, handlers, presenters and UI.

Required negative proof includes:

- global demo account without a membership cannot access an unrelated tenant;
- restricted Galaxia operator cannot see Sabor & Brasa BI or IDs;
- tenant A cannot read/change tenant B product, ingredient, recipe, stock, order or customer with known IDs;
- recipe lines cannot connect records from different tenants;
- concurrent purchases cannot overspend one ingredient;
- repeated identical checkout is idempotent; mismatched reuse conflicts;
- failed checkout leaves customer, order and stock unchanged;
- Hub gateway never returns a non-member company;
- cache entries and portfolio summaries do not cross actors or tenant sets.

Browser verification covers both demo profiles, company selection, direct workspace entry, presets, recipe detail, stock adjustment, simulated checkout, automatic order appearance, customer history, refresh/new session, desktop/mobile, keyboard/focus, console and overflow.

## Gates

At minimum:

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei lint
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei build
pnpm --filter @matriz/app-matriz-hub test
pnpm --filter @matriz/app-matriz-hub lint
pnpm --filter @matriz/app-matriz-hub typecheck
pnpm --filter @matriz/app-matriz-hub build
pnpm run test:smoke
pnpm run prisma:validate
```

Because Core/Seumei schemas, shared DTOs and MyHub are affected, execute every global schema, manifest, boundary and contract gate defined by the root package. Apply migrations only to disposable PostgreSQL unless separate real-environment authority is provided.

## Non-goals

- Production payment processing, fiscal documents, refunds or bank reconciliation.
- External delivery marketplace connectors.
- Automatic e-mail/SMS.
- Supplier, purchasing, lots, warehouses or ingredient cost accounting.
- Arbitrary page builder or arbitrary CSS stored in the database.
- Unrestricted global administrator bypass.
- Refactoring unrelated Matriz apps merely to make the demo catalog look complete.
- Claiming every registered app supports production global SSO when its own public contract does not prove it.

## Completion evidence

The umbrella cycle ends only after all three slices are implemented and connected, migrations are additive, demo provisioning is repeatable, tenant A/B tests pass, the full browser route flow is captured, the multi-tenancy scorecard is published, all gates pass consecutively in the committed state and the worktree is clean.

The final report must state separately:

- what is genuinely production-shaped;
- what is intentionally simulated;
- which apps honor the global demo session;
- the measured multi-tenancy percentage and each remaining gap;
- the next smallest vertical slice.
