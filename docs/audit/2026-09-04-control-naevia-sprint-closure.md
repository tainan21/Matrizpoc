# Control 1.1 + NAEVIA 1.0 — sprint closure

Date: 2026-09-04

This audit closes the local implementation sprint pragmatically. `complete`
means implemented with local automated evidence. `manual` means the product
behavior exists but the current harness cannot operate the Windows shell.
`external` means release infrastructure outside the repository is required.
Deferred items are not represented as implemented.

## Release matrix

| Area | Status | Evidence / closure |
| --- | --- | --- |
| Control shell, Hub and daily utilities | complete | Frontend suite, Rust suite and two installed acceptance cycles |
| Control Terminal ownership and shutdown | complete | Windows Job Object ownership; child tree cleanup covered in installed cycles |
| Control Store authority | complete locally | Built-ins, runtime activation and verified desktop-install preview/confirm authority |
| Control updater | complete locally | Explicit check/download/install contract and signed-fixture coverage |
| Portable infrastructure | complete locally | PostgreSQL, Garnet and NATS lifecycle plus migrations, seed, backup/restore and ownership evidence recorded in NAEVIA acceptance checkpoint |
| Doctor, Git, environments and Workbench surface | complete locally | Typed commands, focused tests and global contract gates |
| Control tray Show | manual | Implemented; actual Windows notification-area click is outside the WebView2 CDP harness |
| Control global shortcut | manual | Implemented with graceful registration failure; physical system-wide key injection is outside the current harness |
| NAEVIA browser/capsules/tabs | complete | Unit suite and real Electron Playwright suite |
| NAEVIA policy isolation | complete | Human, agent-safe and agent-full native boundaries tested in Electron |
| NAEVIA Terminal, downloads and Workbench panel | complete | Native IPC sender validation and real Electron journeys |
| NAEVIA Store | complete for v1 scope | Real Hub catalog plus fixed-path handoff to the authoritative Matriz Control Store |
| NAEVIA legacy import | complete for v1 scope | Capsule/tab metadata, journal, backup, explicit rollback and crash-recovery acceptance |
| Full Chromium profile/vault migration | deferred | Credentials, arbitrary Chromium partitions and VHDX/BitLocker migration are intentionally excluded from v1 |
| Advanced autonomous browser-agent protocol | deferred | Capsule policy is the v1 agent feature; autonomous privileged controls require a separate threat model and milestone |
| Authenticode, public updater and releases | external | Requires CI authentication, certificates/private signing keys and an official release endpoint |
| Electron legacy cutover | blocked by public release | Preserve source and historical releases until signed Control and NAEVIA releases are accepted |

## Definition of sprint completion

The local sprint is closed when both app-local gate sets pass, fresh installers
are produced, hashes are recorded, and no unmanaged processes or ports remain.
Public release is a separate operational gate. It must not be simulated with
local unsigned installers.

## Explicit v1 trade-offs

- NAEVIA opens Control for Store operations; it does not duplicate installer authority.
- The handoff opens the Store owner but does not yet focus a product by deep link.
- Capsule/tab migration is supported; secret and vault migration is not.
- Tray and global-shortcut verification remain two short manual Windows checks.
- Failed public signing or publishing does not reopen locally accepted product behavior.

## External release checklist

1. Authenticate the release runner against the official repository and Hub.
2. Provision Authenticode and Tauri/update signing secrets in CI, never in Git.
3. Build and publish immutable artifacts from the accepted commit.
4. Verify signatures, feed metadata and a real Control update.
5. Run the two manual Windows shell checks.
6. Publish NAEVIA, then retire the old Electron Control without deleting history.
