# Workbench file protocol v1

Every initialized project owns a `.matriz` directory. Clients must validate the
schemas before use and send the current `revision` for updates.

- JSON writes use a temporary sibling file followed by atomic rename.
- JSONL activity is append-only.
- IDs use UUIDs with an artifact prefix, including `tsk_`, `wi_`, `phase_`,
  `ini_`, `in_`, `spr_`, `commit_`, `req_`, `doc_`, `goal_` and `evt_`.
- `roadmap.json` may keep one legacy set of up to 100 goals and up to 12
  specialized scorecards. Each scorecard contains exactly 100 uniquely
  numbered binary goals.
- The repository root may own `.matriz/**` under the reserved project id
  `matriz-infra-hub`; the same traversal and symlink protections apply.
- `.matriz/repositories.json` stores portable external-source metadata and
  document allowlists. It never stores a local absolute path.
- `.matriz/local/repository-bindings.json` stores machine-specific absolute
  paths, is ignored by Git and grants read-only access to registered sources.
- `.matriz/blueprints/*.json` stores deterministic scaffold proposals. A
  blueprint does not create source files.
- External document catalogs store path, title, class, size and hash only.
  Content is read from the source on explicit request and within size limits.
- Permanent deletion is not part of v1; records transition to `archived` or
  `cancelled`.
- Absolute paths, traversal segments and symlinks escaping `.matriz` are
  rejected.
- Markdown is rendered as text-derived React nodes. Raw HTML is not executed.

See `FEDERATED-PORTFOLIO.md`, `PROJECT-BLUEPRINTS.md` and
`SITES-INTEGRATION.md` for the operational flows.

## Work items v2

The backlog folder accepts V1 `tsk_*.json` records and V2 work items. Reading a
V1 record creates an in-memory projection only; the file is not rewritten.
Creating a work item uses `wi_<uuid>`. Editing a V1 item preserves its `tsk_`
identifier and writes schema version 2 to the same path.

V2 separates `productStatus`, `validationStatus`, `humanReviewStatus` and
`documentationStatus`. Agent request and run status remain separate files.
Completing an agent request never completes or validates the product state.

Board writes take a short per-item lock under the Git-ignored
`.runtime/workbench/locks` folder, re-read the persisted revision while holding
the lock, then use the existing atomic JSON replacement. A stale revision is a
visible conflict; it is never resolved with last-write-wins.

The product flow is `discovery`, `refined`, `ready`, `in_progress`,
`validation`, `completed`, plus `archived`. Interactive moves follow adjacent
states. Archiving is an explicit inspector operation, not a board column.

V2 may add `parentId`, `originRef` and `archive`. These fields are optional so
older V2 records stay valid without backfill. An Outcome may contain Feature,
Bug or Task; a Task may contain another Task. Parent relations stay within one
project, reject cycles and cannot point to archived work. `archive` records a
reason, actor and timestamp. An Inbox `originRef` is permanent provenance.

## Coordinator Inbox

The repository workspace (`matriz-infra-hub`) owns
`.matriz/inbox/in_<uuid>.json`. Inbox records are proposals, not work items.
Their states are `untriaged`, `triaged`, `accepted` and `discarded`.

Acceptance is human-only and idempotent: a work item is created in the selected
project with an Inbox `originRef`, then the Inbox decision stores the composed
`{ projectId, workItemId }` reference. A retry reuses the same work item.
Discarding requires a reason and neither decision deletes the original entry.
Codex may write `codex_suggestion` entries with origin, reason, confidence and
references, but cannot accept or discard them.

## Coordinator sprints

The repository workspace owns `.matriz/sprints/spr_<uuid>.json`. Sprint work
and outcomes use composed project references; project artifacts are never
copied into the coordinator workspace. At most one sprint can be `active`.
Dates use `YYYY-MM-DD` and the end cannot precede the start.

An outcome commitment references either a WorkItem Outcome or a Roadmap
Initiative. Planned work references one commitment and records its execution
mode. Product state, agent execution, human review and validation remain
independent sources of status. A completed sprint requires a human result for
every outcome plus a closure pointing to a permanent product document. WIP is
derived from work in `in_progress` or `validation`; exceeding the limit needs a
human reason.

## Temporal roadmap

`roadmap.json` keeps phases and initiatives as the strategic source of truth.
Initiatives may add `startDate`, `targetDate`, `domain` and `responsible`
without rewriting older records during reads. Dates use calendar form
`YYYY-MM-DD`; when both dates exist, the target cannot precede the start.

Initiative `backlogIds` accept both legacy `tsk_<uuid>` and V2 `wi_<uuid>`
identifiers. A missing referenced item remains visible as a broken reference;
it is not silently removed. Timeline progress is derived only from linked work
items and never inferred from elapsed time.

All roadmap mutations take the project roadmap lock under
`.runtime/workbench/locks`, re-read the revision under that lock and replace the
JSON atomically. A stale revision is returned as a conflict. Completing every
initiative does not complete its phase automatically: phase completion remains
a human decision about the stated outcome.

### Roadmap markers

`roadmap.json` may also contain up to 100 additive `markers`. Legacy files
without the collection read as `markers: []` and are not rewritten on read.
Every marker belongs to a phase and may narrow its scope to an initiative in
that phase. Dates use `YYYY-MM-DD`; positions in the timeline are derived only
from `targetDate`.

Kinds are `milestone`, `validation_gate`, `decision_gate` and `release`.
Milestones and releases use `planned`, `achieved`, `missed` or `cancelled`.
Gates use `planned`, `pending_review`, `passed`, `failed` or `waived`.
Approval requires a human reviewer and reviewable evidence. Waiver requires a
human reviewer and a reason. Agent execution may supply candidate references,
but never changes marker, initiative, phase, product or score state.

Marker writes reuse the roadmap lock, optimistic revision and atomic JSON
replacement. Activity remains append-only and uses the marker identifier as
`entityId`, so marker history can be queried without treating the activity log
as the roadmap source of truth.

## Appearance preferences

Color mode and the experimental design-system identifier are browser
preferences stored in `matriz-workbench-theme` and
`matriz-workbench-system` cookies. They are rendered into the first HTML as
`data-theme`, `data-system` and `--wb-*` variables. They are never persisted
under `.matriz/**` and are not shared between users.

## Dependency map

The dependency view is a projection of each work item's persisted
`dependencyIds`; it does not infer relationships from text, roadmap position or
agent activity. An edge points from the prerequisite to the dependent item and
is resolved only when the prerequisite product state is `completed`.

Missing identifiers remain visible as broken references. Cycles are detected
and surfaced without rewriting either item. Archived standalone items are
excluded, but an archived prerequisite remains visible while an active item
references it. The view never changes product status, creates blockers or
removes a dependency automatically; edits continue through the revisioned work
item inspector.

## Agent execution review

Agent requests remain `schemaVersion: 1`. The optional `review` field is
additive, so requests created before this capability stay readable without a
silent rewrite. A review records `approved` or `changes_requested`, the human
reviewer, timestamp, note and the reviewed run revision.

Only a completed request can be reviewed. Approval requires a result summary
and at least one recorded check; requesting changes requires a note. Review
writes use the current request revision and a request-scoped lock, so two open
pages cannot silently overwrite each other.

The decision applies only to that execution. It never changes the work item's
product, validation, human-review or documentation state, and never updates a
roadmap marker, phase or score. Activity remains append-only under
`agent_request.review_approved` or `agent_request.changes_requested`.
