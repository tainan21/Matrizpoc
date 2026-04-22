# Build & Deploy Model — Matriz V1.1

Operational contract for running, building, and deploying the monorepo.

## 1. Local development

```bash
pnpm install
pnpm -r typecheck
pnpm lint
pnpm test:smoke
pnpm --filter @matriz/app-<app> dev   # e.g. @matriz/app-spot
```

`pnpm dev` (root) runs all five apps in parallel via `turbo run dev`. Use
filters to run just one.

## 2. Build per app

Two entry points:

```bash
# canonical: turbo + workspace filter
pnpm turbo run build --filter=@matriz/app-spot...

# wrapper: validates boundaries, then builds
pnpm tsx tooling/scripts/build-app.ts spot
```

The wrapper runs `verify-app-boundaries.ts` first, then delegates to turbo.
It is the command used by CI and should be preferred in release pipelines.

## 3. Deploy per app (Vercel)

Each app is a **separate Vercel project** pointing at its own directory under
`apps/<app>`. Configuration lives in `apps/<app>/vercel.json`:

- `buildCommand` uses `pnpm -w turbo run build --filter=@matriz/app-<app>...`
- `installCommand` uses `pnpm install --frozen-lockfile`
- `framework = nextjs`

### Vercel project settings (one-time, per app)

1. **Root Directory**: `apps/<app>` (critical — Vercel must treat each app
   as its own root).
2. **Build Command**: left empty (Vercel reads `vercel.json`).
3. **Install Command**: left empty (same reason).
4. **Output Directory**: `.next`.
5. **Environment Variables**: set per-app (see `docs/vercel-deployment-map.md`
   for the planned subdomain layout).
6. **Deploy Hook**: create a deploy hook per project (Settings → Git →
   Deploy Hooks). Copy the URL into the matching GitHub secret.

### GitHub repository secrets (CI)

Configure these once under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `VERCEL_DEPLOY_HOOK_MATRIZ_HUB` | Deploy hook URL for matriz-hub |
| `VERCEL_DEPLOY_HOOK_SPOT` | Deploy hook URL for spot |
| `VERCEL_DEPLOY_HOOK_SEUMEI` | Deploy hook URL for seumei |
| `VERCEL_DEPLOY_HOOK_CONTRACTS` | Deploy hook URL for contracts |
| `VERCEL_DEPLOY_HOOK_WILLDASH` | Deploy hook URL for willdash |
| `SPLIT_REPO_PAT` | (optional) GitHub PAT for `split-apps.yml` |

`VERCEL_TOKEN` and `VERCEL_ORG_ID` are only required if you later swap deploy
hooks for the Vercel CLI path.

### Triggering deploys

- **On push to main** touching `apps/**` or `packages/**`: all 5 deploy
  hooks fire in parallel after the gate passes.
- **Manual**: `gh workflow run deploy-apps.yml -f app=<app|all>`.

## 4. Packages that WILL be published (V2)

These are candidates for `@matriz/*` npm publication after V1.1 stabilizes:

- `@matriz/platform-auth`
- `@matriz/platform-storage`
- `@matriz/platform-telemetry`
- `@matriz/platform-pdf`
- `@matriz/foundation-types`, `@matriz/foundation-schemas`,
  `@matriz/foundation-constants`, `@matriz/foundation-utils`
- `@matriz/integration-api-contracts`
- `@matriz/integration-events`
- `@matriz/integration-external-links`
- `@matriz/design-system`

Publication prerequisites:
1. Typecheck, lint, smoke all green.
2. `pnpm tsx tooling/scripts/verify-app-boundaries.ts` passes.
3. Semver bump in the package's `package.json`.
4. No `workspace:*` transient dependency (each published package consumes
   peers via `^`).

## 5. Mental model

- Monorepo is the **source of truth**.
- Each app is a **leaf**; packages are **shared roots**.
- CI gates boundaries **before** any deploy or split runs.
- Split (see `app-extraction-model.md`) only happens after an app proves
  it has zero cross-app dependencies.
