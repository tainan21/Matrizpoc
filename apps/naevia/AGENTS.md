# NAEVIA Agent Guide

NAEVIA is a dedicated Windows browser. Keep browser authority in `electron/`, product UI in `src/`, and shared IPC view models in `src/shared.ts`.

- Never import another app's `src/**` or `app/**`.
- Remote pages never receive the preload bridge.
- Renderer messages carry IDs and bounded user input, never partitions, paths, commands, or executable arguments.
- Every remote `WebContentsView` uses sandbox, context isolation, web security, and a capsule-specific persistent partition.
- Deny permissions, popups, and non-HTTP(S) navigation by default.

Validate with `test`, `lint`, `typecheck`, `build`, `e2e`, then `package` for release work.
