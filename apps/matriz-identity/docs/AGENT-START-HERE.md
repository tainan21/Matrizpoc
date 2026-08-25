# Matriz Identity — Agent Start Here

1. `src/manifest/manifest.ts` — manifest autoritativo.
2. `src/bootstrap/index.ts` — composição única.
3. `src/config.ts` — defaults OIDC e validação fail-closed.
4. `src/provider.ts` — composição do `oidc-provider`.
5. `src/neon-adapter.ts` e `src/persistence.ts` — persistência exclusiva Core.
6. `src/authorization.ts` — contexto server-only.

Nunca importe internals de outro app, nunca aceite tenant/roles/capabilities
como autoridade pública e nunca registre tokens, secrets ou payloads OIDC.
