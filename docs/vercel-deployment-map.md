# Vercel Deployment Map — Matriz V1.1

Canonical mapping between an app, its directory, its Vercel project, its
public subdomain, and its future standalone repository.

| App | Directory | Vercel project (suggested) | Public subdomain | Future repo |
|---|---|---|---|---|
| matriz-hub | `apps/matriz-hub` | `matriz-hub` | `matrizhub.com.br` | `matriz/hub` |
| spot | `apps/spot` | `matriz-spot` | `spot.matrizhub.com.br` | `matriz/spot` |
| matriz-admin | `apps/matriz-admin` | `matriz-admin` | `admin.matrizhub.com.br` | `matriz/matriz-admin` |
| seumei | `apps/seumeiapp` | `matriz-seumei` | `seumei.matrizhub.com.br` | `matriz/seumei` |
| contracts | `apps/contracts` | `matriz-contracts` | `contracts.matrizhub.com.br` | `matriz/contracts` |
| willdash | `apps/willdash` | `matriz-willdash` | `willdash.matrizhub.com.br` | `matriz/willdash` |

## Per-app Vercel configuration

For each row, inside the Vercel UI:

1. **Import Git repository** pointing at the monorepo.
2. **Root directory** = the `Directory` column above.
3. **Framework preset**: Next.js.
4. **Build/install commands**: leave empty (read from `apps/<app>/vercel.json`).
5. **Domains**: attach the `Public subdomain` column value. Route the apex
   `matrizhub.com.br` to the `matriz-hub` project.
6. **Environment variables**: scope per-project. Shared env (e.g. DB URLs,
   AI gateway keys) must be set in each project that needs them.
7. **Deploy hooks**: create one hook per project, paste URL into the
   matching `VERCEL_DEPLOY_HOOK_*` GitHub secret.

## Auth isolation between subdomains

Each app uses `createSessionStorage(appId)` (namespaced by `matriz.auth.<appId>`),
so:

- `spot.matrizhub.com.br` and `matrizhub.com.br` share the same eTLD+1 but
  do **not** share sessions — each app owns its namespace.
- Moving to a cross-subdomain SSO (V2) requires swapping the storage adapter
  for a cookie-based one, without changing `SessionStorage`'s interface.

## Rollout order

1. matriz-hub (public entry point, depends on no other app)
2. spot (isolated domain, safe to deploy after hub)
3. seumei
4. contracts
5. willdash

Each one can be rolled out independently once its Vercel project is
configured and its deploy hook secret is set.
