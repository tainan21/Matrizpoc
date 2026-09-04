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

## Recovery, selected-tab and native sender follow-up

- `9d868da7`: profile replacement compares the prepared snapshot with the current committed snapshot. An edit made while import prepares its backup now aborts replacement without losing the edit. Journal reads and writes share one queue; real Electron recovery tests exposed and eliminated concurrent journal rename failures.
- `e9a1ad6d`: preserves the exact selected legacy tab, not merely the first tab in its capsule. The regression failed before the mapper correction.
- `53e5e290`: all native IPC handlers require the live shell's top frame and exact local entry URL. An actual second Electron window with the same URL and preload could previously read the profile and create a terminal; both requests are now refused. Shell navigation to another document is blocked; ordinary remote browser content has no preload bridge. Packaged builds ignore the development-URL override.
- `abc35b64`: extends the restart journey with concurrent closing and creation of tabs. This additional scenario passed without a production change.

Fresh NAEVIA verification: **34 unit tests**, lint, typecheck, production build, and **nine real Electron tests**. Recovery coverage seeds five interrupted on-disk transaction states (`prepared` before/after replacement, `active`, and `rollback_prepared` before/after replacement), starts the actual app, requires explicit rollback, and verifies persistence after restart. This is not equivalent to fault injection at every filesystem instruction.

The installer passed `recovery-ipc-cycle-1` and `recovery-ipc-cycle-2`, nine tests per cycle followed by successful uninstall. These installed cycles precede the test-only concurrent-close extension; that extension was separately verified in the development executable. Subsequent UI changes and their installed verification are recorded below.

That checkpoint's installer SHA-256 was `e12add7280208548d955a3c43a88df45daf407358475bb1db60a7f046acfda65`. Authenticode remained **NotSigned**; this was not a public trusted release.

Related Control verification in this follow-up: 126 frontend tests, lint, typecheck, Rust tests, formatting and Clippy with warnings denied; a fresh native build and 18 selected WebView2 tests covering shell/navigation, Hub/Store built-ins, Terminal, themes, responsive surfaces and exit. The app-runtime and native-Admin installer journeys were not rerun in this selection. The explicitly opted-in NATS portable integration also passed: pinned artifact installation, authenticated startup, owned health and stop under a temporary root. Both NATS ports were free afterward. This does not certify live PostgreSQL/Garnet, seed, restore or signed updater flows.

Secondary-worktree comparison: the NATS implementation matches `main` after line-ending normalization; `main` additionally tests preservation of `NODE_ENV`. Other documents already match, and the previously absent in-progress operational audit was preserved in `050c9b9b`. The dirty secondary worktree was not discarded or force-removed. Its historical audit remains marked **IN PROGRESS**, not current acceptance evidence.

Final local follow-up:

- `82a2f244`: fixes the missing NAEVIA infrastructure contract found by the real global verifier. The browser declares no provisioned database, cache or broker. Verification now passes for 18 apps and eight schemas; desktop releases and boundaries are coherent. Global smoke: 404/404 (the PostgreSQL error-containment fixture still reports an unavailable local server as expected).
- `4936074b`: corrects the unreadable default white New Tab button, reusing dark chrome colors and adding visible keyboard focus. A real Electron computed-style regression failed before correction.
- The final NAEVIA package passed **both** `final-chrome-cycle-1` and `final-chrome-cycle-2`, **nine tests each**, including concurrent tab closing and the styling regression, followed by uninstall. Current SHA-256: `d801e6ee94a23e807abd7f99277bf0805644e554a1a743c4a65dc39971fc6591`. The fixed installer folder contains this artifact; it supersedes all hashes above and remains **NotSigned**.
- `2e37041d`: Control restore verification now attempts recovery on a failed post-swap query and no longer reports successful recovery when rollback fails. Three focused Rust regressions cover those failures and verified success; the full Rust suite, format and Clippy passed. No real database restore was executed for this correction.
- The resulting Control NSIS passed `restore-safety-cycle-1` and `restore-safety-cycle-2`: **28 actual Playwright journeys per installed cycle**, including app lifecycle and native Admin, followed by uninstall. These cycles used explicit isolated NSIS install → `e2e:run` → uninstall, not the old blanket contract-result recorder; the separate idle-performance phase was not repeated. Current installer SHA-256: `62b90799f70ec325a8ceb0614896ab53b2cac3d00330d44867e0baab485f3332`, copied to `artifacts/installers/Matriz-Control-1.1.0-windows-x64-setup.exe`. It remains **NotSigned**.
- `3f9e9a41`: removes automatic certification of all 98 Control acceptance cases from suite exit alone. The regression reproduced the false blanket verdict; cases without individual evidence now remain blocked. Final Control frontend suite: **127/127**, with lint/typecheck passing. These reporting changes do not alter the installed product binary.
- GitHub authentication was rechecked and remains unavailable. Signing secrets have not been verified; no push, tag or public release was attempted.

## Remaining migration gates

The current importer covers capsule and tab metadata plus a backup/rollback of the NAEVIA snapshot. It does **not** establish complete migration of Chromium partitions, credentials, vault VHDX/BitLocker, library or download history. The guards above improve this partial importer; they do not make it a complete migration. Concurrent-edit and seeded recovery coverage now exist; full-profile migration and broader interruption/failure coverage remain necessary.

The Store panel displays the Hub catalog and can now open the fixed per-user Matriz Control executable so the user can continue in the authoritative Store. NAEVIA deliberately does not download or execute Store installers and does not claim a duplicated desktop installation lifecycle. Product-specific deep-linking and automatic return status are deferred; the handoff opens Control and the user selects the product there. The first native capsule-policy boundary is enforced and accepted in the real Electron process: `agent-safe` refuses downloads and DevTools, `agent-full` permits downloads but not operator DevTools, and `human` permits both. All policies still deny remote permissions, popups, unsafe protocols and privileged bridges. This is a baseline boundary, not yet an agent automation protocol; advanced browser capabilities remain a later product milestone. The Workbench contextual surface now has real Electron acceptance: it is attached at the fixed versioned loopback route, receives no NAEVIA bridge, uses a bounded 340 px panel and detaches cleanly. An unavailable Workbench rolls the panel layout back without interrupting browsing. The larger signed updater/release gates are not certified by the browser tests.

Control's installed-result recorder previously marked every one of its 98 contract IDs as passed from suite exit alone. That blanket inference has been removed. Installed Playwright now emits structured per-journey evidence, and only exact reviewed mappings become passing contract cases; unknown, failed, skipped and unmapped cases remain blocked. Completing the remaining per-case evidence map is still a release gate, alongside signed Store/updater upgrade acceptance. Portable PostgreSQL, Garnet and NATS lifecycle, repository migrations, local seed, backup/restore, process ownership and the Pay outbox-to-JetStream-to-Ops durable consumer path now have isolated real-stack evidence, including transactional inbox idempotency.

Keep the legacy source and releases intact. Do not perform cutover, create the final legacy tag or claim the overall plan is complete based only on installer cycles.
