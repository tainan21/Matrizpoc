# Design Alpha scope and non-scope

Design Alpha is an exploratory visual reference. It can inform a local proposal
that is reimplemented through canonical tokens and primitives after accessibility
and boundary review. It is not a monorepo package, runtime contract, dependency,
CSS source, or API authority.

## Permitted use

- Compare visual language, states, and hierarchy without copying code, CSS, or
  external dependencies.
- Propose a token/component only after it meets local stability, two-consumer,
  and domain-free criteria.
- Register the proposal in the canonical package and validate it with tests and
  Storybook.

## Non-use

- Do not import Design Alpha, its external library, or internal paths.
- Do not replace Workbench cookie SSR themes, Hub Alpha `--hub-*`/3D boundary,
  presenters, product rules, or local persistence.
- Do not treat a visual reference as approval for portable distribution.

External adoption requires separate approval, a portable public surface, license,
security, and accessibility audit, plus rollback. Until then it is `retain` as a
reference, not a migration target.
