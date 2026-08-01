# Matriz Workbench — Agent Start Here

> Mandatory next read: `agent-handbook/README.md`.

## 30-second overview

Workbench discovers folders in `apps/*` plus the reserved repository-root
project `matriz-infra-hub`, and exposes compact, task-oriented context. Its
source of truth is the selected project's `.matriz/**` folder.

## Working flow

1. list projects;
2. read the selected project summary;
3. read one backlog item or agent request;
4. use the roadmap score to select goals still at `0`;
5. inspect only its linked docs/files;
6. change source through normal Codex permissions, never through Workbench;
7. record progress;
8. complete the request with summary, changed files and checks;
9. move a goal to `1` only after reviewing observable evidence.

## Layers

- `src/domain/` — app-local schemas and invariants;
- `src/application/` — use cases and context selection;
- `src/integration/filesystem/` — the only persistence adapter;
- `src/integration/codex/` — local App Server transport and run snapshots;
- `src/ui/` — view models and interactive components;
- `src/mcp/` — explicit MCP resources/tools;
- `app/` — Next.js routes and server actions.

All Workbench MCP writes require user approval in Codex.
Integrated Codex threads start read-only and surface command/file approvals in
the Workbench. See `CODEX-APP-SERVER.md`.

The primary product relationship is human + Codex. Multiagent work is optional
and only appropriate for independent, bounded parallel tasks. Personas, skills,
agents and plugins are separate mechanisms; the handbook defines when to use
each one.
