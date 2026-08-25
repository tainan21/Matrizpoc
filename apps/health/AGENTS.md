# AGENTS.md — Health

Health owns lightweight, read-only local observability for Windows resources and processes.

Read `docs/AGENT-START-HERE.md`, `README.md`, `src/manifest/manifest.ts`, `src/bootstrap/index.ts`, and `public-contract.ts` before changing this app.

- Keep system observation and any future adapters app-local.
- Never import another app's internals; consume only public contracts.
- Do not control processes or take ownership of another product's domain.
- UI receives view models through app-local presenters when domain views are introduced.
- Validate with `pnpm --filter @matriz/app-health test`, `typecheck`, and `lint`.
