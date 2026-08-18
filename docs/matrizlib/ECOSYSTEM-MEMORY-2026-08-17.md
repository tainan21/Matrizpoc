# Matriz ecosystem memory - 17 August 2026

This document is the durable product and migration memory produced from the
101-route visual audit, repository architecture, manifests, and the MatrizLib
inventory. It is a snapshot, not a replacement for source code or manifests.

## Shared intent

Matriz is a local-first multi-application ecosystem joined by manifests, public
DTOs, events, external links, onboarding, authentication, and a shared visual
contract. The Hub is the institutional control plane; product applications keep
their own domain; the Workbench coordinates local work; MatrizLib supplies
domain-free visual contracts.

Apps never import another app's internals. UI receives view models. Shared
packages contain only stable cross-application concerns. Promotion requires two
real consumers and a measurable reduction in maintenance.

## Applications

### Matriz Hub

- **Role:** institutional control plane and public map of the ecosystem.
- **Does:** app catalog, projects, registry, architecture, events, relations,
  health, telemetry, onboarding, capabilities, appearance, and documents.
- **Current state:** operational shells and registry/project views work; Docs
  is blocked when PostgreSQL/Prisma is unavailable; telemetry has sparse data;
  some protected routes redirect to login.
- **Intent:** make the ecosystem inspectable and operable without absorbing the
  domains owned by other apps.
- **Next:** restore persisted Docs, improve guard behavior, fill telemetry,
  validate keyboard/focus/long content, and register MatrizLib as the eighth app.

### Matriz Workbench

- **Role:** local-first workspace for people, Codex, and agents.
- **Does:** focus, projects, inbox, backlog, sprints, agents, knowledge,
  decisions, documents, activity, collaboration, and optional integrations.
- **Current state:** unlock and several work/project views render; missing
  `.matriz` directories can turn local absence into a page-level invalid state.
- **Intent:** coordinate work using Git-backed local metadata without a cloud
  database or imports from product internals.
- **Next:** make missing directories explicit empty states, use real IDs, keep
  navigation/actions visible during partial failure, and recapture TV states.

### Contracts

- **Role:** contract/document operation for the ecosystem.
- **Does:** dashboard, contracts, templates, onboarding, and protected access.
- **Current state:** all audited routes render final UI with mock tenant data;
  appearance recommendations and excess login methods compete with tasks.
- **Intent:** receive contract requests through public DTOs and keep contract
  rules local.
- **Next:** prioritize magic link, reduce theme-banner interference, clarify
  onboarding, and evaluate template density on TV.

### Seumei

- **Role:** establishments and owners, with contract-generation integration.
- **Does:** operational overview, establishment/owner lists, onboarding, login.
- **Current state:** shell works; primary lists are mostly empty and their calls
  to action are weak or absent.
- **Intent:** own establishment domain while exchanging only public contracts.
- **Next:** add actionable empty states, link establishment and owner journeys,
  compact mobile headers, and make onboarding operational.

### Sites

- **Role:** data-driven site runtime and configured-site catalog.
- **Does:** site catalog and localized preview.
- **Current state:** desktop, mobile, and TV are visually strong; some console
  requests return 404/401 and large headings reduce content density.
- **Intent:** render identities from configuration without inheriting another
  product domain.
- **Next:** remove failing requests and rebalance catalog/preview typography.

### Spot

- **Role:** gigs, artists/bands, and requests for contracts.
- **Does:** operational dashboard, gig/band lists, onboarding, login.
- **Current state:** core shell works; gigs and bands lack representative data
  or actionable empty states; identity is strong but mobile headers are large.
- **Intent:** own entertainment work and publish only stable integration data.
- **Next:** add `Criar gig`, capture representative bands, compact mobile
  navigation, and progressively disclose alternate login methods.

### WillDash

- **Role:** observer of goals, activities, dashboards, and ecosystem events.
- **Does:** goals, activity timeline, dashboards, raw telemetry, onboarding,
  login, and overview.
- **Current state:** all audited routes render; producer data is sparse, raw IDs
  reduce readability, and wide cards reduce scanability.
- **Intent:** observe through events/contracts without taking ownership of the
  producing apps' domains.
- **Next:** connect empty states to producers, replace technical IDs with names,
  improve density, and test data-heavy views on TV.

### MatrizLib portal

- **Role:** visual documentation, component catalog, theme laboratory, and
  migration control surface for the local canonical design packages.
- **Does:** explain `@matriz/design-system` and `@matriz/design-ui`, demonstrate
  stable components, inventory C001-C099, and document promotion/migration.
- **Initial state:** to be created in `apps/matrizlib` on port 3007.
- **Intent:** make the shared visual contract discoverable and trustworthy while
  preventing premature package pollution.
- **Next:** build the portal, register the eighth manifest, catalog 99 entries,
  and progressively migrate proven work from `C:\Apps\matrizlibUI`.

## MatrizLib authorities

| Concern | Authority |
| --- | --- |
| Token values, names, themes, CSS | `@matriz/design-system` code |
| Stable primitive behavior | `@matriz/design-ui` code and tests |
| Demonstration and catalog | `apps/matrizlib` |
| Product composition and copy | owning application |
| External historical reference | `C:\Apps\matrizlibUI` (read-only) |

The external project contains useful primitives, shells, hooks, blocks, tokens,
themes, and Next adapters. It also contains divergent dependencies, aliases,
global CSS, product-opinionated components, and generated artifacts. Nothing is
copied wholesale. Each migration receives an owner, consumers, tests, public
surface, accessibility review, and rollback path.

## Cross-ecosystem priorities

1. Resilience before breadth: Hub Docs and Workbench missing-data behavior.
2. Real, actionable empty states in domain apps.
3. Mobile header and login-method restraint.
4. Human-readable names instead of internal IDs.
5. Accessibility and keyboard evidence for every promoted component.
6. C001-C099 as a qualification backlog, not a claim that 99 stable exports
   already exist.
7. New themes enter the canonical registry later without restructuring the
   portal or duplicating commercial/persistence concerns.

