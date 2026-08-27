# Matriz Control — Operational Intelligence

## Outcome

Add five small, connected capabilities that turn existing ENV, Explorer,
Runtime, Store and Action primitives into safer operational workflows. Each
feature has one primary action and one compact surface. The round must deepen
the Control without introducing a generic automation engine, IDE or remote
marketplace.

## Direction

Three directions were considered:

1. **Operational depth (selected):** compose existing native authorities into
   trustworthy developer workflows.
2. **Visual spectacle:** ecosystem topology and 3D rooms create more novelty,
   but do not yet improve the daily operating loop.
3. **Commercial expansion:** remote catalog and payments broaden Store, but
   require signing, distribution and financial boundaries that are not ready.

The selected direction follows the user's constraint: fewer controls, better
screens, and no complexity without a current consumer.

## Shared architecture

All five capabilities remain app-local in `apps/matriz-desktop`:

```text
Compact UI
  → typed DesktopGateway request
  → exact Rust command
  → catalog/path/revision/ownership validation
  → bounded result
  → safe ActivityEnvelope
  → contextual Action Registry / Agent Presence
```

The renderer receives view models, never generic filesystem, process or shell
authority. Rust remains authoritative for secret movement, reference search,
runtime ownership, package grants and runbook execution. No shared package is
created because there is still only one native consumer.

## Feature 1 — ENV Compare & Promote

The ENV Manager gains a `COMPARAR` action. A compact two-column surface compares
the selected environment with one other supported `.env` file.

Each key has one state: equal, changed, missing on source, or missing on target.
Normal values may be shown. Sensitive values are represented only as `definido`,
`diferente` or `ausente`; their contents never cross the native boundary.

The primary action is `PROMOVER SELECIONADAS`. Rust copies selected values from
source to target using the target revision as a compare-and-swap guard. This
allows a secret to move between local environments without revealing it to
React. The result returns a refreshed masked document and can offer the existing
`APLICAR & REINICIAR` action.

Not included: three-way merge, cloud secrets, bulk environment creation or
automatic conflict resolution.

## Feature 2 — Impact Radar

A variable row gains one contextual action: `IMPACTO`. The native process
searches only the selected app directory, only allowlisted text extensions, and
within strict file/count/size limits. It searches the variable name, never its
value.

The inspector shows:

- number of files and matches;
- relative filenames grouped by folder;
- line number and a short redacted line preview;
- `ABRIR NO EXPLORER` for one selected match.

Results are ephemeral. Activity records only the variable name and match count,
not source lines or absolute paths.

Not included: language-server indexing, dependency graphs, semantic analysis or
continuous background indexing.

## Feature 3 — Runtime Recovery

Managed runtimes gain a compact recovery strip only when they are degraded,
unhealthy or have exited unexpectedly. External runtimes remain protected and
receive diagnosis only.

The strip summarizes the current condition and exposes one primary action:
`RECUPERAR`. Recovery is a fixed native-safe sequence:

1. verify ownership;
2. stop the owned session when needed;
3. start the catalog operation;
4. wait for bounded readiness;
5. report success or failure to Activity.

Secondary links reuse existing actions: terminal, logs and Doctor. There is no
automatic retry loop and no background process supervisor.

## Feature 4 — Package Trust Center

Store package details gain a trust section instead of a new top-level page.
Before installation, the user sees a small permission consent sheet with plain
language descriptions.

The native catalog provides a deterministic manifest digest. Installation
persists a receipt containing package ID, version, digest, granted permissions
and installation time. Store can show `VERIFICADO`, `ALTERADO` or `SEM RECIBO`.
`REPARAR` only rewrites trusted registration metadata for the bundled package;
it never downloads or executes code.

The primary action remains `INSTALAR` or `REPARAR`. Acquisition and installation
stay separate.

Not included: remote packages, public-key signatures, publishers, install hooks,
payments or arbitrary permissions.

## Feature 5 — Operational Runbooks

Actions gains a focused `RUNBOOKS` section built from existing exact commands.
The first version ships only three cataloged workflows:

- **VALIDAR AMBIENTE:** validate ENV, run Doctor, return a result.
- **RECUPERAR E ABRIR:** recover a managed runtime, wait for health, open its
  declared primary route.
- **APLICAR E VISUALIZAR:** save an already prepared ENV revision, restart the
  managed runtime and open Preview.

A runbook is a native-defined sequence of typed step IDs. React can choose a
runbook and app context, but cannot submit commands, arguments, URLs or arbitrary
step lists. The UI shows current step, completion and one terminal result.

No workflow editor, scheduler, conditional graph, retries, persistence or
third-party connectors are included.

## Product composition

The visual thesis is **quiet operational confidence**: near-black surfaces,
precise purple selection, dense typography and color reserved for runtime state.
No new dashboard mosaic is introduced.

- ENV Compare replaces the table body while active and returns to editing in
  one click.
- Impact Radar uses the existing right-side inspector pattern from Explorer.
- Runtime Recovery appears only during failure and disappears after recovery.
- Trust Center extends the existing Store detail column and uses one modal-like
  consent sheet.
- Runbooks use a short vertical stepper inside Actions, not a node editor.

Interaction stays restrained: fast panel transitions, clear progress movement
and one success pulse. Reduced-motion preferences must keep every state legible.

## Failure and safety rules

- Every ENV mutation requires the current target revision.
- Secret values never appear in diff DTOs, activity, tests, logs or agent data.
- Reference search cannot follow symlinks outside the catalog app and stops at
  configured limits.
- Recovery never adopts or stops an external runtime.
- Package consent cannot grant permissions absent from the bundled manifest.
- Runbook execution is serialized per app and rejects renderer-defined steps.
- Cancellation leaves completed steps recorded and does not pretend rollback.

## Testing and acceptance

Implementation follows test-first development.

- Rust authorization tests cover secret-safe promotion, stale revisions, search
  boundaries, external runtime protection, receipt integrity and runbook IDs.
- TypeScript contract tests cover exact Tauri command names and DTO mapping.
- React tests cover compare selection, redacted impact results, recovery states,
  permission consent and runbook progress/failure.
- Existing lint, typecheck, frontend suite, Rust suite and production build must
  stay green.
- Final visual verification captures ENV Compare, Runtime Recovery, Trust Center
  and Runbooks at the existing 1280 × 720 product viewport.

## Deliberately deferred

Rooms 3D, topology overlays, persistent activity analytics, remote package
distribution, real-money credits, arbitrary automation, automatic crash loops,
semantic code indexing and direct Codex task control remain outside this round.
