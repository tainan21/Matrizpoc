# `@matriz/design-ui` architecture

`@matriz/design-ui` is the domain-free React layer above the pure
`@matriz/design-system` contract. Apps keep decisions in the app: presenters
produce view models, routes coordinate use cases, and components render props.

## Separate authorities

| Authority | Location | Decides |
| --- | --- | --- |
| Implementation | `src/*.tsx` and `src/*.css` | behavior, semantics, executable API |
| Metadata | `src/metadata.ts` | name, status, tokens, accessibility guidance |
| Executable catalog | `stories/**` and `.storybook/**` | examples, controls, usage scenarios |
| Tokens | public `@matriz/design-system` | shared visual names and values |

These surfaces do not replace each other: code owns values and behavior,
metadata is descriptive, and a story is not a public API.

## Runtime boundaries

Modules using hooks, context, listeners, or focus declare their client boundary
locally. Public barrels must not make a server component accidentally import a
client dependency. CSS is consumed only through `@matriz/design-ui/styles.css`.

## What stays local

Product copy, navigation, auth, remote state, persistence, price/entitlement
rules, and view-model adaptation stay in the app. Workbench retains cookie SSR
themes; Hub Alpha retains `--hub-*` and its 3D boundary.
