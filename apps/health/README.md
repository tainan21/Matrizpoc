# Health

Lightweight, local Windows resource and process observability.

## Ownership

- **Responsibility:** Read-only local system observation.
- **Exposes:** `public-contract.ts` with the app manifest only.
- **Does not expose:** `src/**` and `app/**` internals.
- **May import:** Matriz packages and other apps' `public-contract.ts` manifest surfaces.
- **Must not import:** Another app's `src/**` or `app/**`; Health also must not control processes or own product data.

The local development server runs on `http://127.0.0.1:3010` and exposes `/api/health`.
