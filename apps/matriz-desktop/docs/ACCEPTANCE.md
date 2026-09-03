# Matriz Control — Windows acceptance

The release contract validates the installed product, not only source code.

## Local release gate

1. Run `corepack pnpm --filter @matriz/app-matriz-desktop test`, `typecheck`, and `lint`.
2. Run Rust format, tests, and Clippy with warnings denied.
3. Run `corepack pnpm --filter @matriz/app-matriz-desktop package` once.
4. Run the Playwright WebView2 gate with `corepack pnpm --filter @matriz/app-matriz-desktop e2e`.
5. Run `acceptance:installed` twice with distinct `MATRIZ_ACCEPTANCE_RUN_ID` values.
6. Confirm both lifecycle records say `pass` and `uninstalled: true`, with the same installer SHA-256.
7. Generate the canonical Markdown report with `node apps/matriz-desktop/acceptance/generate-report.mjs`.

Evidence is written below `output/matriz-control-acceptance/` and remains
ignored. The tracked report contains no machine-specific user path.

### Evidence limitation

A zero exit code from Playwright proves only its executed journeys. The old
recorder incorrectly marked all 98 catalog cases as passed from that exit code.
It now records them as `blocked` until individual case evidence is explicitly
mapped. A successful install/test/uninstall cycle must not be presented as
complete contract or public-release acceptance. Historical generated reports
using the old blanket verdict do not certify the current release.

## Coverage

- nine catalog apps, including external-port ownership protection;
- six bounded PowerShell/ConPTY tabs, Unicode, Ctrl+C, streaming, and cleanup;
- installed-product exit, settings persistence, Doctor, Git pulse, and command deck;
- Matriz Admin native build, verified install, start, and stop;
- Playwright connects directly to the owned WebView2 process over an ephemeral CDP port; no registry change or EdgeDriver is used;
- 42 screenshots per cycle, covering all 14 primary areas at compact, standard, and wide sizes;
- four operational themes applied through native settings, restored after reload, and captured as temporary evidence;
- accessible names, keyboard focus, overflow, reduced motion, idle CPU/RAM, and startup upper bound;
- installer verification, install, product execution, and uninstall.

## Safety

### Portable process ownership checkpoint (2026-09-03)

Portable services now record their native launch handle's PID, Windows creation
time, canonical executable and SHA-256 in an atomic app-local receipt. Inspection
and stopping revalidate that identity. Stop uses the same verified Windows handle
through termination and waits for exit, rather than reopening a potentially reused
PID. A live recorded service remains visible before its listening port is ready.

Regression tests reproduced both previous failures: an externally started copy at
the catalog executable path was treated as owned, and a recorded process without
a port was treated as stopped. Both now pass, including external-process survival,
receipt recovery, changed identity fields and corrupt receipts. The pinned real
NATS install/start/inspect/stop integration also passed with the new receipts.

Existing services started before launch receipts existed are deliberately not
adopted by executable path. They must be stopped explicitly outside this new
ownership flow and then started through Control. This checkpoint does not certify
full PostgreSQL/Garnet data operations or the overall release.

### Live PostgreSQL checkpoint (2026-09-03)

The explicitly opted-in native test downloaded the pinned PostgreSQL 17.11
artifact into a temporary root, initialized a fresh cluster, recovered ownership
from the launch receipt, provisioned eight schemas, applied eight synthetic
migrations with guard backup, verified their ledgers, created a logical backup,
changed a row and restored the earlier row through a temporary database.

Its first run exposed premature stop confirmation. PostgreSQL now receives its
own fast-shutdown signal through the bundled `pg_ctl`, while Control retains the
verified process handle and waits for exit. The repeated journey passed and
`pg_controldata` confirmed `shut down`, rather than crash recovery. No existing
database was used. This is evidence for the native lifecycle and restore path,
not acceptance of all repository migrations, local seed, Garnet or public release.

### Native Store signature checkpoint (2026-09-03)

A regression using the Windows-signed PowerShell executable exposed two real
verification failures: Windows PowerShell inherited incompatible PowerShell 7
module paths, and its signature-status enum serialized as a number while Rust
expected text. Verification now uses Windows PowerShell's own module discovery,
explicit status serialization and an exact signer simple-name comparison.
Unsigned files, wrong publishers, partial names and empty publishers are refused.
The helper runs hidden. This validates the native trust check, not publication,
an entire signed Store installation or the Control updater chain.

### Live Garnet checkpoint (2026-09-03)

The pinned Garnet 2.1.5 package passed native installation, authenticated PING,
anonymous-access refusal, ownership recovery and stop in a temporary root.
Installation/promotion and startup now also require valid Authenticode with the
exact `Microsoft Corporation` signer through the existing app-local verifier.
A regression proved that the old installed-file shortcut accepted an unsigned
replacement; it now refuses it. The real signed artifact passed again after
enforcement. Cache persistence across restart and a full app/stack integration
remain separate acceptance work.

The harness only accepts the official per-user install directory or an isolated
acceptance root. It never kills unrelated listeners. If a catalog port is
already occupied, the journey asserts the `EXTERNO` protected state and leaves
that process untouched. Acceptance markers must never appear in the production
executable.

CI repeats the same procedure daily and on manual dispatch through
`.github/workflows/matriz-desktop-acceptance.yml`.
