# NAEVIA — Agent Start Here

Read `README.md`, `src/manifest/manifest.ts`, `src/bootstrap/index.ts`, `src/shared.ts`, then `electron/main.ts`.

The Electron main process owns capsules, sessions, remote views, permissions, downloads and persistence. The React renderer is trusted local chrome but receives only view models. Remote pages run in separate `WebContentsView` instances without preload or privileged IPC.
