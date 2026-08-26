# Control desktop updater implementation plan

1. Add failing desktop-contract tests for four payload-free updater commands and a renderer-safe update snapshot/event.
2. Add a tested app-local updater coordinator around a small adapter; keep development/unpackaged mode unavailable and all download/install actions explicit.
3. Wire `electron-updater` into the Electron main process only, never the MCP command server, and preserve signature/differential-download defaults.
4. Build the compact update-center dialog from view models and connect the existing header button.
5. Document CI/release-channel prerequisites without adding secrets or inventing a production URL.
6. Run scoped validation, full smoke/boundary checks, and request a final code review.
