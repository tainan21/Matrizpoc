# Workbench file protocol v1

Every initialized project owns a `.matriz` directory. Clients must validate the
schemas before use and send the current `revision` for updates.

- JSON writes use a temporary sibling file followed by atomic rename.
- JSONL activity is append-only.
- IDs use UUIDs prefixed by `tsk_`, `req_`, `doc_`, `goal_` or `evt_`.
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
