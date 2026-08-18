# MatrizLib

## Ownership (L9)

- **Responsibility:** public reference portal for Matriz design contracts,
  component catalog documentation, themes, and architecture guidance.
- **Exposes:** `public-contract.ts` with the app manifest only.
- **Does not expose:** portal UI, catalog internals, bootstrap internals, or
  future route implementation details.
- **May import:** public APIs from `@matriz/design-*`,
  `@matriz/integration-*`, `@matriz/flows-*`, `@matriz/platform-*`, and
  `@matriz/foundation-*` when needed by the portal.
- **Must not import:** any other app's `src/**`, product-domain code, or an
  external MatrizLib repository at runtime.

MatrizLib runs locally on `http://localhost:3007`. It is a public
design/reference application, not a product-domain application and does not
own a database.
