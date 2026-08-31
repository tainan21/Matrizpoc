# AGENTS.md — Matriz Admin

Matriz Admin owns cross-product customer and establishment administration. It may retain legacy local models during migration, but it must not become the database owner of Seumei business data.

Read `docs/AGENT-START-HERE.md`, `README.md`, `src/manifest/manifest.ts`, `src/bootstrap/index.ts`, and `public-contract.ts` before changes.

- Never import another app's internals.
- Use public contracts or explicit gateways.
- Keep the desktop runtime app-local.
- Validate with `pnpm --filter @matriz/app-matriz-admin test`, `typecheck`, `lint`, `build`, and `package:desktop` when native code changes.
- Distribution: `matriz-admin-tauri`, Windows `com.matriz.admin`, tag `admin-v*`; read `../../docs/release-distribution.md`.
