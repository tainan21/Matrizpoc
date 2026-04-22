# App Extraction Model — Matriz V1.1

How to promote an app from the monorepo into its own repository without
breaking the ecosystem contract.

## 1. Readiness checklist

Before extracting an app, confirm:

- [ ] `pnpm tsx tooling/scripts/verify-app-boundaries.ts <app>` passes.
- [ ] The app's `public-contract.ts` exports only `{ manifest }`.
- [ ] The app does not import from any `apps/<other>/src/**`.
- [ ] All shared dependencies are already published or ready to publish
      under `@matriz/*` (see `build-deploy-model.md` §4).
- [ ] Events produced/consumed by the app are declared in
      `packages/integration/events`.
- [ ] DTOs crossing the boundary live in
      `packages/integration/api-contracts/v1`.

## 2. Automated extraction

```bash
pnpm tsx tooling/scripts/export-app.ts <app> <destination-dir>
```

The script:
1. Copies `apps/<app>` (minus `node_modules`, `.next`, `.turbo`) to the
   destination.
2. Rewrites `workspace:*` / `workspace:^` references in `package.json` to
   `^1.1.0` (matching the published baseline).
3. Drops a `README.md` breadcrumb noting the export timestamp.

Or run the workflow:

```bash
gh workflow run split-apps.yml \
  -f app=spot \
  -f destination=matriz/spot \
  -f branch=split
```

## 3. Destination repository layout

After extraction the repo is expected to look like:

```
<app>/
  app/
  src/
    auth/
    bootstrap/
    config/
    domains/
      <domain>/
        application/
        domain/
        integration/
        presentation/
    integration/
    manifest/
    mock/
    state/
  package.json         (workspace:* rewritten to ^1.1.0)
  vercel.json
  prisma/schema.prisma
  next.config.mjs
  tsconfig.json
```

## 4. First run in the new repo

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test   # (optional; copy tests you want to keep)
```

If a typecheck fails, it is almost always because:
- A `@matriz/*` package version is missing in the registry — publish first.
- A shared symbol was imported directly by path — restructure to consume
  from the package barrel.

## 5. Keeping published packages in sync

After extraction, the monorepo remains the **source of truth** for shared
packages. The extracted app consumes them as regular npm dependencies. A
post-publish hook in the monorepo CI can open an automated PR in the
extracted repo bumping the relevant `@matriz/*` dep.

## 6. Rollback

Extraction is non-destructive: the source tree stays in the monorepo.
If the split turns out premature, you simply stop pointing production at
the new repo and keep deploying from the monorepo. No data migration is
required for session/auth because auth state lives in the browser storage
namespaced by `appId`, not by repo.
