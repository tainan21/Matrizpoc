# MatrizLib local

The canonical MatrizLib in this monorepo is `@matriz/design-system` (tokens,
CSS, and metadata) plus `@matriz/design-ui` (React primitives and Storybook).
The external library is reference-only: it is not a dependency, runtime source,
or API authority until a separate portable adoption is approved.

## Authorities

| Concern | Authority |
| --- | --- |
| Token values, names, themes, CSS | code and `@matriz/design-system/css` |
| Token/component description | public `./metadata` subpaths |
| Primitive behavior | code published by `@matriz/design-ui` |
| Demonstrable scenarios | `@matriz/design-ui` stories |
| Domain decision, copy, state | owning app |

Metadata and stories make a contract observable; they do not create alternate
values or APIs. See [MIGRATION.md](MIGRATION.md) for consumer guidance and
[DESIGN-ALPHA.md](DESIGN-ALPHA.md) for reference limits.

## App-local versus shared

A need remains local when it serves one app, carries product entity/rules, or
depends on auth, route, storage, integration, or persisted theme. It enters
`design/*` only with two real consumers, stable visual semantics, no domain,
and real maintenance reduction. UI consumes view models; design packages never
fetch, persist, or transform entities.

## Debt taxonomy

| Class | Meaning and action |
| --- | --- |
| `fix-now` | Breaks a boundary, security, or basic accessibility; fix before promotion. |
| `migrate-later` | A public replacement exists; consumers migrate in a planned step. |
| `retain` | Compatibility is still needed; keep and audit consumers. |
| `deprecate` | Communicate replacement, version/date, and migration path; do not remove yet. |
| `remove` | Remove only after an inventory and verified migration. |

Known debt: legacy CSS aliases are `retain` while consumers exist; they become
`deprecate` with a schedule and `remove` only after audit. The external library
is `retain` as a reference, never as an import shortcut.
