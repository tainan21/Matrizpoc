# seumei

## Ownership (L9)
- Responsibility: domínio de estabelecimentos e operação.
- Exposes: `public-contract.ts` (manifest-only).
- Must NOT import other apps.

## Desktop

`desktop/` is the standalone Windows delivery surface of the same Seumei app.
It reuses app-local use cases and presenters, composes repositories with a
namespaced local store, and does not require Next.js, Node or Matriz Hub at
runtime.

```powershell
pnpm --filter @matriz/app-seumei dev:desktop
pnpm --filter @matriz/app-seumei build:desktop
pnpm --filter @matriz/app-seumei package:desktop
```

The current-user NSIS installer is produced at
`desktop/src-tauri/target/release/bundle/nsis/Seumei_<version>_x64-setup.exe`.
Do not commit `dist/`, `target/` or installers. Control owns the local
build/install/start UX; a future Hub download must point to a signed release.
