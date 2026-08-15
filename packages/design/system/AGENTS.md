# `@matriz/design-system`

## Responsibility

This package is the local canonical authority for pure MatrizLib visual contracts:
tokens, declarative themes, public CSS, and token metadata. It does not decide
product, price, entitlement, tenant, persistence, or remote theme selection.

## Explicit authorities

- `src/tokens.ts` and `src/themes.ts` define code names, values, and fallbacks.
- `src/tokens.css` is the CSS contract published as `@matriz/design-system/css`.
- `src/metadata.ts`, published as `@matriz/design-system/metadata`, describes
  tokens for tools and consumers; it does not replace code values.
- Package tests verify contract consistency. Stories live in `@matriz/design-ui`;
  they demonstrate consumption and do not define tokens.

## Imports and changes

- Use only visual data, foundation types, and domain-free utilities.
- Never import `apps/**`, `packages/integration/**`, `packages/flows/**`,
  `packages/access/**`, repositories, storage, HTTP, or product types.
- Public tokens use `--matriz-*`, are semantic and app-independent. Add value,
  CSS, metadata, and a test together.
- A request named for a screen, customer, plan, price, or app flow stays in its
  app or flow; it is not a shared token.

## Contribution examples

- Accepted: add an app-independent semantic focus token needed by two apps,
  together with its TypeScript value, public CSS variable, metadata, and test.
- Rejected: add a Seumei pricing-banner token or plan/entitlement metadata;
  those are screen and product policy owned by the app or an appropriate flow.

## Lifecycle

Keep legacy aliases while a consumer exists. Deprecation needs a public
replacement, migration note, and consumer inventory; removal needs verified
migration. Classify debt as `fix-now`, `migrate-later`, `retain`, `deprecate`,
or `remove` as defined in `docs/matrizlib/README.md`.

Run package lint, typecheck, and test before finishing. A public CSS change also
needs validation of affected consumers.
