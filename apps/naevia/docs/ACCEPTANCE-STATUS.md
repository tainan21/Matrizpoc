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

## Profile/import safety and release readiness follow-up

- `e7454978`: validates profile identities, references, active tab and web URLs before persistence/replacement. A malformed saved profile is copied intact to a uniquely named recovery file before starting with a fresh snapshot; ordinary filesystem read errors are not treated as an empty profile.
- `802b1ea8`: blocks import while the known installed `Matriz Control Electron.exe` is running, rechecks closure and SHA-256 at confirmation, and rejects non-empty SQLite WALs. The process check fails closed when unavailable. It does not identify arbitrary renamed binaries or development Electron instances.
- `503fa7c2`: serializes import/rollback transactions, validates recovery snapshots, preserves the profile replaced by rollback, records rollback preparation before replacement, and refuses to overwrite an outstanding/corrupt recovery journal with another import.
- `18d5d7d4`: compiles NAEVIA before CI Playwright acceptance and uploads the verified installer before registering its download URL in Hub. YAML parsing and local checks passed; the GitHub workflow itself has not been executed.
- `af431e5a`: updates the security inventory for the existing updater GET endpoint. No test expectation or route implementation was weakened.

Fresh verification: 29 NAEVIA unit tests, lint, typecheck, build, three real Electron Playwright tests, NSIS packaging, and two install/test/uninstall cycles (`import-safety-cycle-1`, `import-safety-cycle-2`). Global smoke: **404/404**, boundaries and desktop release matrix passed. The smoke suite logs an unavailable local PostgreSQL connection while successfully testing error containment; this is not evidence of live infrastructure acceptance.

Latest local installer SHA-256: `aa164da357f182d77c5383638d946692d868b27d45a870e36cb4f35bdad86629`. It supersedes both hashes above and is copied to `artifacts/installers/naevia-1.0.0-windows-x64-setup.exe`. Authenticode status remains **NotSigned**.

Public-release blocker: `gh secret list --repo tainan21/Matrizpoc` returned exit code 4 because GitHub CLI is unauthenticated. The required CI secret names are known from the workflow, but their provisioning has not been verified. No keys/tokens were read, no tag was created, and no release or push was attempted.

## Remaining migration gates

The current importer covers capsule and tab metadata plus a backup/rollback of the NAEVIA snapshot. It does **not** establish complete migration of Chromium partitions, credentials, vault VHDX/BitLocker, library or download history. The guards above improve this partial importer; they do not make it a complete migration. Reconciliation with ordinary browsing edits during import and crash/restart acceptance of every transaction phase remain necessary.

The current Store panel displays the Hub catalog; it is not proof of a complete desktop installation lifecycle. Agent policy labels, advanced browser capabilities and the Workbench contextual surface require their own functional acceptance. The larger Control/infra/updater/release gates are not re-certified by these three browser tests.

Keep the legacy source and releases intact. Do not perform cutover, create the final legacy tag or claim the overall plan is complete based only on installer cycles.
