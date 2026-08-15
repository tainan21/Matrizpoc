# Contributing to MatrizLib UI

## Choose the right location

Keep a one-screen/one-flow need and any product semantics in its app. Promote to
`@matriz/design-ui` only after two real consumers, stable API, no domain data,
and demonstrated maintenance savings. An app-independent new token belongs in
`@matriz/design-system`, never as a duplicated component value.

## Contribution checklist

1. Import public contracts only; do not use another package or app `src/**`.
2. Use native elements, accessible names, visible focus, and descriptions/status
   where needed. Test keyboard, Escape, and focus restoration for popups, plus
   non-color cues.
3. Update `componentMetadata` and a story. Cover normal plus relevant focus,
   disabled, loading, error, long-content, light/dark, density, reduced motion,
   and mobile states.
4. Stable components set `parameters.a11y.test = "error"`; automation does not
   replace manual review.
5. Run `pnpm --filter @matriz/design-ui lint`, `typecheck`, `test`, and
   `build-storybook`.

## Deprecation

Do not remove a public API in the change that deprecates it. Publish a
replacement, register `deprecated` metadata, document migration, and wait for
verified adoption. Classify the pending work with the shared debt taxonomy.
