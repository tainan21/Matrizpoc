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

## Concurrent persistence follow-up

A real Electron regression creating three tabs concurrently reproduced an `EPERM` rename failure. The same repository also returned different initial capsule identities to simultaneous readers of a missing profile.

`BrowserRepository` is now in its own app-local native module. Reads, mutations and replacements share one promise queue; failed writes do not publish uncommitted memory state or block subsequent operations. No persistence format, dependency or shared package changed.

- 19 unit tests passed, including concurrent initialization/writes and recovery after a real filesystem write failure.
- Lint, typecheck and production build passed.
- The restart acceptance now preserves six tabs, including concurrent creation and capsule activation.
- The latest NSIS passed `state-fix-cycle-1` and `state-fix-cycle-2`, all three real Electron tests in each cycle, followed by uninstall.
- Latest installer SHA-256: `38f16d48fdfcfe3c3e3255be63ccd9a576215ad1ab312c93bb6d1e26e1aab456`. This supersedes the installer above and remains an unsigned local build.

## Remaining migration gates

The current importer covers capsule and tab metadata plus a backup/rollback of the NAEVIA snapshot. It does **not** establish complete migration of Chromium partitions, credentials, vault VHDX/BitLocker, library or download history. Verification that the legacy process is closed, snapshot shape validation, and import-specific transaction/recovery coverage also remain necessary.

The current Store panel displays the Hub catalog; it is not proof of a complete desktop installation lifecycle. Agent policy labels, advanced browser capabilities and the Workbench contextual surface require their own functional acceptance. The larger Control/infra/updater/release gates are not re-certified by these three browser tests.

Keep the legacy source and releases intact. Do not perform cutover, create the final legacy tag or claim the overall plan is complete based only on installer cycles.
