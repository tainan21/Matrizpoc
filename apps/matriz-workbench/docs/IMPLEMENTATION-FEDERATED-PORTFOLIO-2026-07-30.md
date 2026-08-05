# Federated portfolio implementation — 2026-07-30

## Result

The approved meta plan is implemented as an incremental proof:

- seven internal apps are registered, including `sites`;
- four external repositories are portable registry entries;
- three local checkouts are available read-only;
- Seumei has 81 Markdown files in its repository and 54 in the current
  allowlisted catalog;
- Matriz Lib UI exposes safe package, version, script and document summaries;
- project blueprints create previews and Codex workflow artifacts, never source;
- Sites renders a generic example in pt-BR and English;
- backlog has structural project/site scope;
- Workbench supports persisted light/dark;
- MCP exposes named read and approved workflow tools only.

## Seumei project-school artifacts

The Infra Hub Workbench workspace contains:

- `seumei-knowledge-map`;
- `seumei-bounded-context-map`;
- `seumei-reusable-capabilities`;
- `seumei-conflicting-decisions`.

They reference source material without copying it.

## Evidence-based score

Specialized Workbench tracks:

- App: 4/100;
- Docs: 2/100;
- Features & domains: 13/100.

Infra Hub documentation track:

- Docs: 9/100.

The older general Workbench maturity score remains 78/100 and is intentionally
separate. Specialized tracks do not inherit its points. Run
`pnpm --filter @matriz/app-matriz-workbench sync:federated-evidence` to verify
that every newly awarded point still references an existing evidence file.

## Verification

- Workbench: lint, typecheck, 89 tests and production build;
- Sites: lint, typecheck, 5 tests and production build;
- repository: 120 smoke tests;
- boundaries: all seven apps pass;
- MCP: 31 named tools, eight discovered workspaces, four external sources,
  54 Seumei documents and the `example` site;
- browser: desktop/mobile, light/dark, pt-BR/English and zero console errors in
  the verified flows.

Screenshots are stored in `output/playwright/01-workbench-focus-desktop.png`
through `output/playwright/10-workbench-roadmap-scores.png`.

## Still pending

- no Seumei code or data migration was attempted;
- Laudate remains reference-only;
- Matriz Lib UI remains physically disconnected until package-domain audit;
- blueprint application still belongs to an approved Codex turn;
- site metadata proposals do not edit `site.json`;
- cloud, database, embeddings, multiuser collaboration and remote sync remain
  outside this proof.

## Recommended next state

Audit `@matriz/blocks` and `@matriz/product-ui` for strong product semantics,
then use one approved blueprint end to end. Only after that should a single
Seumei vertical slice be selected for parity and tenant-isolation tests.
