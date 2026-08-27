# Workbench + Seumei Windows Store Implementation Plan

**Goal:** Deliver Workbench and Seumei as independently installed Windows x64 Electron/NSIS apps acquired through the trusted Matriz Control Store.

**Architecture:** Control owns a typed, fail-closed acquisition state machine and Windows integration. Workbench owns a local Next.js/Electron runtime and `.matriz/**`; Seumei owns a minimal Electron shell for its trusted HTTPS web origin. Distribution metadata uses `StorePackageManifestV1` from `@matriz/integration-api-contracts`; no app imports another app's internals.

## Global constraints

- Preserve the existing dirty-worktree changes in Control/root/lockfile/smoke tests.
- No renderer-supplied URL, path, command, publisher or environment map.
- Production rejects unsigned manifests and installers; missing trust configuration is `unavailable`.
- Workbench data and Seumei product domain remain app-local.
- Use TDD and scoped checks before global convergence.

## Task 0 — Public distribution contract

Add and smoke-test the versioned `StorePackageManifestV1` schema, including strict Windows x64, HTTPS, size, filename and SHA-256 validation.

## Task A — Control native Store

Generalize Health activation into `activation | windows-installer`, add Workbench and Seumei, implement typed desktop commands, signed-manifest acquisition, download/hash verification, Windows install detection, open/uninstall, and Store status UI. Replace bundled Workbench hosting with an installed-app connector and keep MCP unable to mutate installs.

## Task B — Workbench desktop

Add an independent Electron shell, single-instance lifecycle, loopback standalone server, automatic native session, validated workspace binding, NSIS packaging, release-manifest generation and transitional runtime compatibility. Exclude sources, `.matriz`, environment files, docs, logs and caches.

## Task C — Seumei desktop

Add a minimal independent Electron shell that loads only configured trusted Seumei/MyHub origins, preserves web session cookies, denies privileged browser capabilities, reports offline/misconfiguration honestly, and builds an NSIS/release manifest without bundling the server, Prisma or secrets.

## Task D — Convergence and release

Update the lockfile once, remove the Workbench bundle from Control, add independent Windows workflows, update governance/docs and run scoped plus global checks. Production publishing remains unavailable until signing and trusted-origin configuration exists.
