# NAEVIA acceptance checkpoint — 2026-09-03

This is a partial migration checkpoint, not approval to retire Matriz Control Electron.

## Native browser surface

The previous download acceptance dispatched a DOM event instead of clicking. Replacing it with a Playwright mouse click exposed a real defect: the remote view was detached with a zero-size viewport. `ensureView` waited for network completion before attaching it; stopping or failing the load could leave it detached permanently.

Views now attach synchronously, independently of network completion. Acceptance uses an actual Playwright click. A separate local-server regression holds the initial response open, checks that the view is attached with positive bounds, stops loading, navigates again and clicks a button successfully.

Verified in this checkpoint:

- 17 unit tests; lint; typecheck; production build.
- Three real Electron Playwright tests (browser/download/import rollback, restart persistence, interrupted initial navigation).
- NSIS packaging and two isolated install/test/uninstall cycles: `click-fix-cycle-1` and `click-fix-cycle-2`, three tests each, product executable removed after both cycles.
- Installer SHA-256: `fec6544eff0a5ec73939eba70ad21b4c6269a2ac8a654274888115a83d9c599f`.
- Installer is **NotSigned**: local acceptance only, not a publicly trusted release.

## Remaining migration gates

The current importer covers capsule and tab metadata plus a backup/rollback of the NAEVIA snapshot. It does **not** establish complete migration of Chromium partitions, credentials, vault VHDX/BitLocker, library or download history. Closed-source-process verification and stronger concurrent-state/recovery coverage also remain necessary.

The current Store panel displays the Hub catalog; it is not proof of a complete desktop installation lifecycle. Agent policy labels, advanced browser capabilities and the Workbench contextual surface require their own functional acceptance. The larger Control/infra/updater/release gates are not re-certified by these three browser tests.

Keep the legacy source and releases intact. Do not perform cutover, create the final legacy tag or claim the overall plan is complete based only on installer cycles.
