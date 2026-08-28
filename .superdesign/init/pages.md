# Key Page Dependency Trees

## `/` — Overview

Entry: `apps/matriz-ops/app/page.tsx`

- `apps/matriz-ops/app/page.tsx`
  - `apps/matriz-ops/src/application/user-directory.ts` (data only; exclude from visual generation)
  - `apps/matriz-ops/src/server/ops-session.ts` (auth only; exclude from visual generation)
  - `apps/matriz-ops/src/ui/AppShell.tsx`
    - `apps/matriz-ops/src/manifest/manifest.ts`
- `apps/matriz-ops/app/layout.tsx`
  - `apps/matriz-ops/app/globals.css`

## `/users` — User Directory

Entry: `apps/matriz-ops/app/users/page.tsx`

- `apps/matriz-ops/app/users/page.tsx`
  - `apps/matriz-ops/src/application/user-directory.ts` (data only)
  - `apps/matriz-ops/src/server/ops-session.ts` (auth only)
  - `apps/matriz-ops/src/ui/AppShell.tsx`
    - `apps/matriz-ops/src/manifest/manifest.ts`
- `apps/matriz-ops/app/layout.tsx`
  - `apps/matriz-ops/app/globals.css`

Planned pages should inherit the same shell and build app-local view-model components rather than consume database entities.
