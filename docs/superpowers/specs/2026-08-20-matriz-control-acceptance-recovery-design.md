# Matriz Control — Acceptance and Recovery Cycle

## Decision

The first cycle of the next Matriz Control program is an evidence-driven
acceptance and recovery cycle. It does not add the app store, identity,
installation telemetry, updater, service management or MatrizLib release
automation yet.

The cycle first measures the currently installed application, the current
source build and a clean installation produced from current source as three
distinct targets. It then closes every Critical and Important functional gap,
adds durable automated coverage and repeats the complete packaged acceptance
suite twice on the final committed state.

The deliverable is not merely a green unit suite. It is a verified Windows
application plus a Portuguese audit report in Markdown, DOCX and PDF with
screenshots and machine-readable evidence.

## Why reliability comes first

Matriz Control already owns meaningful Windows authority: listeners, process
termination, managed development commands, ConPTY terminals, native app
lifecycle, tray behavior, shortcuts, workspace inspection and validation
gates. Building a store or remote telemetry on top of an unverified native
lifecycle would amplify unknown failures and make later diagnosis ambiguous.

Initial investigation found two concrete sources of ambiguity:

- the installed `Matriz Control 0.1.0` executable was last modified on
  2026-08-18 and has a different SHA-256 from the installer generated on
  2026-08-19;
- `.github/workflows/matriz-desktop.yml` still references the removed
  `apps/seumei/desktop` path instead of the promoted Matriz Admin desktop
  surface.

Therefore every result must identify exactly which binary, installer, commit
and configuration produced it.

## Relationship to the larger program

This is Cycle 1 of a longer sequence:

1. acceptance laboratory and functional recovery;
2. release contract and Windows distribution pipeline;
3. experimental Matriz app store and Release Center;
4. shared desktop/web identity;
5. durable installation telemetry presented by Matriz Admin;
6. workspace profiles, Doctor, services, resource pulse and diagnostics;
7. MatrizLib releases and visual/accessibility regression;
8. protocol, notifications, updater and signing.

Only Cycle 1 is designed here. Later cycles receive separate specifications so
their interfaces are based on verified behavior rather than assumptions.

The parallel Seumei assimilation workspace owns `apps/seumeiapp` business
development. This cycle may start and stop Seumei Web as an acceptance target,
but it does not edit Seumei domain code.

## Existing ownership and boundaries

`apps/matriz-desktop` remains the sole owner of the native Control runtime.
Windows adapters stay app-local until a second native consumer proves a stable
shared surface.

- React invokes only typed `DesktopGateway` methods.
- Privileged behavior stays in Rust/Tauri.
- Automated actions accept catalog IDs and structured values, never executable
  paths, raw arguments, process names or arbitrary URLs from the renderer.
- The visible terminal remains the only intentional arbitrary-input surface;
  its input reaches only the terminal session explicitly opened by the user.
- No app imports another app's `src/**` or `app/**`.
- MatrizLib is consumed only through public design exports.
- Test-only hooks must not broaden production capabilities.

## Three-target baseline

### Target A — existing installed application

The existing installation is an observed historical baseline. Before changing
or uninstalling it, record:

- executable path;
- product/file version;
- file size and timestamps;
- SHA-256;
- stored settings location and schema version;
- visible features and navigation;
- startup, terminal, tray and app-control behavior;
- screenshots at the supported window sizes;
- failures and unavailable capabilities.

The audit may launch, hide, restore and close this binary. Destructive process
tests use only processes created by the acceptance harness. The old binary is
not treated as the expected product contract merely because it is installed.

### Target B — current source runtime

Run the Tauri development build from the exact branch and commit under test.
Record the commit SHA, dependency lock hash and runtime versions. This target
is optimized for diagnosis, logs and rapid reproduction.

### Target C — clean packaged installation

Build an NSIS installer from the same commit, verify its SHA-256, install into
a controlled current-user test location and run the full acceptance matrix.
Uninstall it through the generated uninstaller and verify cleanup. This target
is the release candidate and the only target that can produce the final Ready
verdict.

The harness must never infer equivalence from the shared `0.1.0` version. Hash,
commit and build timestamp distinguish artifacts until the release version is
bumped in the distribution cycle.

## Acceptance catalog

Every capability has a stable acceptance ID, preconditions, action, expected
observable state, evidence type, risk class and automation level. IDs do not
depend on test file names, allowing reports and CI history to remain stable
while test implementation evolves.

### Application lifecycle

- `LIFE-001`: a cold launch creates one Control process and one main window.
- `LIFE-002`: the window becomes interactive within the accepted startup
  budget.
- `LIFE-003`: closing the window follows the configured close-to-tray policy.
- `LIFE-004`: tray Show restores and focuses the existing window.
- `LIFE-005`: tray Exit terminates Control and all Control-owned terminal
  children without orphaning unrelated processes.
- `LIFE-006`: `Ctrl+Shift+M` toggles visibility when registration succeeds and
  degrades honestly when the shortcut is unavailable.
- `LIFE-007`: only one expected instance owns the tray/window lifecycle.
- `LIFE-008`: settings survive close, relaunch and an installer upgrade.

### Ports and process safety

- `PORT-001`: refresh lists current TCP listeners with port, PID and process.
- `PORT-002`: Matriz ports 3000–3008 map to the correct canonical apps.
- `PORT-003`: search filters by port, PID and process without mutating source
  state.
- `PORT-004`: terminating a harness-owned observed listener frees its port.
- `PORT-005`: stale snapshot termination is rejected.
- `PORT-006`: protected/system/self/ancestor PIDs are rejected.
- `PORT-007`: kill-many affects only the explicitly selected observed rows.
- `PORT-008`: access denial is actionable and never requests elevation.

### Managed web applications

For each catalog app, `APP-<id>-START`, `APP-<id>-READY`,
`APP-<id>-STOP` and `APP-<id>-RESTART` prove:

- start opens or focuses an observable managed terminal;
- the fixed package command is visible;
- readiness comes from listener state, not parsing terminal text;
- stop first interrupts the owned command and then reconciles listener state;
- restart does not create duplicate managed sessions or orphan processes;
- failure, port conflict and early exit remain visible;
- another process already occupying the port is never claimed as Control-owned.

The matrix covers Hub, Spot, Matriz Admin Web, Contracts, Willdash, Workbench,
Sites, MatrizLib and Seumei Web. Long-running acceptance may use a smaller
representative set per pull request, but the daily/release run covers all nine.

### Terminal

- `TERM-001`: create the first PowerShell session in the selected workspace.
- `TERM-002`: execute deterministic text, current-location and Unicode probes.
- `TERM-003`: stream ordered output without duplicating or losing chunks.
- `TERM-004`: create, switch and identify up to six tabs.
- `TERM-005`: reject a seventh session with clear feedback.
- `TERM-006`: resize the active PTY after window/layout changes.
- `TERM-007`: interrupt a harness-owned long-running command.
- `TERM-008`: close one session without affecting the others.
- `TERM-009`: preserve activity state while the dock is collapsed or another
  view is active.
- `TERM-010`: closing Control terminates its PTYs and leaves no child shell.
- `TERM-011`: terminal output/history is not persisted or emitted as telemetry.

### Actions, Doctor and workspace

- `ACT-001`: typecheck, lint, smoke and Prisma gates run one at a time with
  status, duration and terminal evidence.
- `ACT-002`: cancel/interrupt affects only the selected owned gate session.
- `ACT-003`: invalid workspace is rejected before command execution.
- `DOC-001`: Windows, Node, pnpm, Git, Rust and WebView2 checks report truthful
  state.
- `DOC-002`: missing optional tooling is degraded, not fatal to unrelated
  features.
- `GIT-001`: branch, dirty count and ahead/behind refresh explicitly.
- `JUMP-001`: fixed Explorer, Terminal and local route targets resolve only from
  the embedded catalog.

### Command Deck and navigation

- `CMD-001`: `Ctrl+K` opens the deck and restores prior focus on close.
- `CMD-002`: keyboard navigation and accent-insensitive search work.
- `CMD-003`: destructive PID actions require a second confirmation.
- `CMD-004`: only catalog operations can be executed.
- `NAV-001`: every primary mode remains keyboard reachable at all supported
  sizes.
- `NAV-002`: terminal activity remains visible outside the Terminal view.
- `NAV-003`: status never relies on color alone.

### Matriz Admin native lifecycle

- `NATIVE-001`: runtime distinguishes not built, built, installed and running.
- `NATIVE-002`: package runs the allowlisted Matriz Admin desktop build.
- `NATIVE-003`: install accepts only the resolved expected installer artifact.
- `NATIVE-004`: start opens the installed Matriz Admin binary.
- `NATIVE-005`: closing Admin reconciles Control state.
- `NATIVE-006`: missing/stale/tampered installer produces explicit failure.

Download, update, repair and uninstall from the Control UI belong to the app
store cycle, not this acceptance cycle. The generated Admin uninstaller is
still validated by the external installer harness.

### Settings, accessibility and visual quality

- `SET-001`: theme, sound, volume and close behavior persist atomically.
- `SET-002`: corrupt settings recover to declared defaults without crashing.
- `SET-003`: sound mute/disable is respected and feedback remains nonessential.
- `A11Y-001`: initial focus, tab order, focus outlines and names are valid.
- `A11Y-002`: reduced motion removes nonessential animation.
- `A11Y-003`: live operational states are announced without excessive noise.
- `VIS-001`: no overflow at 420×560, 760×700 and 1440×900.
- `VIS-002`: compact, docked and wide terminal layouts remain usable.
- `VIS-003`: transparency never reduces operational text contrast.

### Installer

- `INST-001`: NSIS installs without elevation for the current user.
- `INST-002`: installed metadata, version, publisher and executable are
  correct.
- `INST-003`: first launch succeeds on the clean installation.
- `INST-004`: settings persist across reinstall/upgrade when intended.
- `INST-005`: silent uninstall returns zero, removes owned files and leaves
  unrelated user data untouched.
- `INST-006`: no target, cache, terminal log, installer or secret becomes
  tracked by Git.

## Automation architecture

### Layer 1 — TypeScript unit and component tests

Vitest remains responsible for pure domain rules, presenters, catalog search,
terminal metadata, view state, accessibility semantics and gateway
serialization. Each public UI action must have success, failure and busy-state
coverage where behavior differs.

Tests do not mock the whole UI. They fake the narrow `DesktopGateway` boundary
and prove which typed request the renderer emits.

### Layer 2 — Rust unit and integration tests

Rust tests cover catalog authorization, snapshot-bound process termination,
workspace canonicalization, PTY lifecycle, settings atomicity, native artifact
resolution and child-process cleanup.

Windows integration tests create their own listeners and child processes. They
never target a pre-existing PID and assert cleanup even after a failed test.

### Layer 3 — IPC contract tests

A contract inventory maps every `DesktopGateway` method to exactly one allowed
Tauri command shape. It fails when a renderer method has no native handler,
when a native handler is unreachable, or when field naming diverges.

Production commands are not weakened for testing. Test data enters through
normal typed calls or an app-local test harness compiled only for the test
profile.

### Layer 4 — packaged renderer E2E

Use WebdriverIO with the official `@wdio/tauri-service`. The current Tauri
guidance recommends its embedded WebDriver, which works without a separately
installed EdgeDriver and exposes frontend/backend logs plus Tauri execution
support.

The E2E suite controls the real Tauri renderer and verifies navigation,
keyboard flows, status, terminal UI, settings and managed actions. Selectors
use roles, accessible names and stable acceptance IDs rather than CSS layout
details.

### Layer 5 — Windows installer and OS harness

An app-local PowerShell acceptance script orchestrates only explicit resolved
paths:

1. capture Target A metadata;
2. build Target C;
3. verify installer hash;
4. install to a validated temporary/current-user location;
5. start the executable and wait for readiness;
6. invoke the packaged E2E suite;
7. verify process/tray/child cleanup;
8. uninstall silently;
9. verify owned-file cleanup;
10. emit structured JSON results.

The script uses one PowerShell process end-to-end for path resolution and file
operations. It validates every temporary path before recursive cleanup and
never deletes a workspace, home directory or unresolved target.

### Exploratory Windows review

Automated tests are the regression authority. A real visual pass supplements
them for tray menus, transparency, native window focus and OS notifications
that WebDriver cannot represent faithfully. Findings discovered manually must
be converted into an automated test at the narrowest effective layer whenever
possible.

## Evidence and reporting

Every acceptance result is emitted as structured data:

```ts
interface AcceptanceResult {
  readonly id: string
  readonly target: "installed-baseline" | "source-runtime" | "packaged-candidate"
  readonly status: "pass" | "fail" | "blocked" | "not-applicable"
  readonly startedAt: string
  readonly durationMs: number
  readonly commit?: string
  readonly artifactSha256?: string
  readonly summary: string
  readonly evidence: readonly string[]
}
```

Evidence paths are relative identifiers in the report; secrets, terminal
history and arbitrary command output are not embedded. Deterministic probe
output may be included after sanitization.

Screenshots cover at least:

- Ports, Apps, Terminal, Actions, Doctor and Settings;
- Command Deck and destructive confirmation;
- terminal running, success, failure and interrupted states;
- Admin Web/Native selector states;
- compact 420×560;
- medium 760×700;
- wide 1440×900.

The canonical committed report is Markdown under `docs/audit/`. DOCX and PDF
are generated from that source, rendered and visually inspected. Generated
binary reports and screenshots remain under ignored `output/` unless repository
policy explicitly designates a final artifact location.

The report distinguishes:

- works as designed;
- works with UX/diagnostic weakness;
- partially works;
- broken;
- disconnected/dead surface;
- not testable with current authority;
- intentionally deferred.

It includes observed evidence, correction, final result, residual risk and the
acceptance IDs that prevent recurrence.

## Daily and pull-request execution

The workflow is corrected to use Matriz Admin paths and split by cost:

### Every relevant pull request

- TypeScript tests, typecheck and lint;
- Rust tests, fmt and clippy;
- frontend build;
- IPC contract inventory;
- a packaged smoke covering launch, navigation and safe exit.

### Daily scheduled Windows run and manual workflow dispatch

- clean package;
- complete installer lifecycle;
- all nine web app lifecycles;
- terminal real-command matrix;
- visual viewport matrix;
- complete acceptance JSON and screenshots;
- artifact/report upload.

### Release candidate

- all daily checks;
- two consecutive complete packaged runs;
- hash and metadata verification;
- no Critical or Important finding;
- explicit Ready/Not Ready verdict.

No scheduled workflow may require private production credentials for Cycle 1.

## Recovery workflow

Failures are fixed by root-cause groups, not by acceptance-order patching:

1. reproduce on the exact target;
2. add or strengthen the narrow regression test;
3. apply the smallest correct fix;
4. run the focused test;
5. run the affected acceptance family;
6. run scoped app gates;
7. repeat the packaged candidate matrix.

Each group permits at most five correction rounds. A repeated external blocker
is documented after three evidenced attempts rather than becoming an infinite
loop.

Priority:

- **Critical:** unsafe process/file authority, secret exposure, data loss,
  installer corruption or inability to exit/clean children;
- **Important:** required feature broken, inconsistent native state, app start
  or terminal lifecycle failure, inaccessible primary action;
- **Minor:** polish or diagnostic weakness with a safe functional path.

Critical and Important findings must be fixed in this cycle. Minor findings
may remain only with explicit rationale and follow-up ownership.

## Performance acceptance

Measure on the packaged candidate after warm OS startup:

- interactive window target: at most 1.5 seconds;
- idle CPU target: below 1% average while visible and inactive;
- idle RAM target: below 120 MB;
- hidden polling: stopped as designed;
- terminal sessions: no renderer for inactive sessions and bounded output;
- no orphan Control-owned process after exit.

A missed target is an Important finding unless environment evidence proves the
measurement invalid. Performance metrics are observations, not fabricated CI
guarantees on shared runners.

## Security and privacy

- Test automation cannot introduce a generic execution command.
- No arbitrary renderer path reaches installer, filesystem or process APIs.
- Installer tests use current-user scope and validated literal paths.
- Screenshots are reviewed for secrets and personal paths before delivery.
- Diagnostic logs redact workspace paths where they add no value.
- Terminal input/output is never uploaded, persisted in reports or prepared for
  future telemetry.
- This cycle emits no remote installation telemetry.
- The future installation telemetry receives a separate privacy and identity
  contract.

## Documentation changes

Cycle 1 updates:

- Matriz Control README and agent-start guide with acceptance commands;
- CI workflow paths and execution tiers;
- decision log for the native acceptance laboratory;
- a test/acceptance coverage map;
- the final audit report;
- known limitations and the handoff to the release/store cycle.

Documentation describes what was verified, not what is merely planned.

## Definition of 100% for this cycle

“100%” does not mean every future product feature exists. It means:

1. every Cycle 1 acceptance ID has an explicit result;
2. every required capability is Pass on Target C;
3. Target C passes two consecutive complete runs from the final committed
   state;
4. no Critical or Important finding remains;
5. unit, Rust, IPC, packaged E2E and installer suites pass;
6. app lint, typecheck, build and package pass;
7. relevant global gates pass because CI/tooling is touched;
8. the installer installs, opens, persists settings as intended, exits and
   uninstalls;
9. screenshots and report match the tested hashes;
10. worktree and tracked-file audits find no secret, cache, installer, target,
    log or temporary artifact.

If environment authority prevents one required result, the verdict is Blocked,
not Ready. A blocked item must show exact evidence and the smallest external
action needed.

## Explicit non-goals

- implementing the app store or remote downloads;
- adding login to installed apps;
- sending installation or usage telemetry;
- building the Matriz Admin analytics UI;
- introducing workspace profiles or service orchestration;
- implementing updater, deep links, notifications or code signing;
- creating a Seumei desktop installer;
- changing Seumei business flows;
- extracting Windows runtime code into a shared package;
- rewriting Matriz Control merely to simplify testing.

These belong to later cycles after the native foundation earns a Ready verdict.
