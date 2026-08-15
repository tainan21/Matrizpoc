# `@matriz/design-ui`

## Responsibility

This package provides domain-free, semantic, accessible React primitives for
MatrizLib. It receives props and view models already prepared by an app; it
never fetches, persists, or interprets product entities.

## Import boundaries

- Allowed: public `@matriz/design-system` surfaces, React, types, and visual
  domain-free utilities.
- Forbidden: `apps/**`, any internal `packages/*/src/**`, `integration`,
  `flows`, `access`, storage, HTTP, auth, routing, and product types.
- Apps use only `@matriz/design-ui`, `@matriz/design-ui/primitives`,
  `@matriz/design-ui/styles.css`, and `@matriz/design-ui/metadata`.

## Promotion and lifecycle

A surface remains app-local until two real consumers need it, its semantics are
stable, it has no domain data, its API is small, and sharing lowers maintenance.
Promotion includes the component, metadata, a DOM test, and a use story.
Deprecation supplies a public replacement, version/date, migration guidance,
and compatibility for the announced period.

## Contribution examples

- Accepted: promote a domain-free accessible form primitive used by two apps,
  with metadata, DOM interaction tests, and stories for its relevant states.
- Rejected: add a checkout or account component that reads auth, routes, plan
  entities, or repositories; its presenter and composition remain app-local.

## Accessibility and stories

WCAG 2.2 AA is the engineering baseline. Review native semantics, accessible
name, visible focus, keyboard behavior, Escape/focus return where applicable,
descriptions, status, and non-color cues. Each component change needs a story
with normal and relevant focus, disabled, loading, error, long-content,
theme/density, and mobile states. Stable stories set
`parameters.a11y.test = "error"`.

Run lint, typecheck, test, and `build-storybook` before finishing.
