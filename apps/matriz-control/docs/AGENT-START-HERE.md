# Matriz Control — Agent Start Here

Matriz Control is the local process cockpit on port 3011. Its source of truth for executable actions is validated workspace package metadata. The server resolves commands and working directories; the browser never supplies them.

Read next: `README.md`, `src/manifest/manifest.ts`, `src/bootstrap/index.ts`, then the terminal domain, catalog, and supervisor.

For external projects, read `PROJECT-HOST.md` and `PROJECT-HOST-THREAT-MODEL.md`. Keep all implementation in `src/modules/projects` or its app-local Electron/UI adapters. Never accept a renderer path, command, argument, environment value, port, or URL; never bypass `TerminalSupervisor`; never adopt or stop a foreign process.
