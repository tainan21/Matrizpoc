# Matriz Agent Operating Kernel — Design

## Goal

Give the Matriz Workbench a local-first, auditable operating model for humans and named agents (“baby Nilos”) to execute bounded missions without granting implicit authority.

## Scope

This first phase belongs entirely to `apps/matriz-workbench`. Its source of truth is the selected project’s `.matriz/agents/**` directory. It adds no database, remote agent runner, shared package, Control mutation, or automatic execution.

## Product model

### Agent profile

An agent profile is a descriptive, non-human operational identity. It has a stable id, display name, persona summary, mission statement, allowed capability ids, default authority, and a human owner label. A profile never grants itself access; the mission is the authority boundary.

### Mission

A mission is a revisioned unit of work assigned by a human to one profile. It records title, objective, project id, bounded allowed paths, authority level, status, context references, acceptance criteria, timestamps and a human approval field. The authority levels are `observe`, `propose`, `change_scoped`, and `execute_approved`. `execute_approved` only states that a human-approved external execution may occur; this phase does not execute commands.

### Handoff and evidence

Handoffs preserve a compact context summary, decisions, risks and next step. Evidence references existing files, test commands, URLs or human notes. Both are append-only records attached to a mission. A mission cannot become `completed` without at least one evidence item and an explicit human reviewer decision.

## Persistence and boundaries

Each project stores JSON records under:

```text
.matriz/agents/profiles/<agentId>.json
.matriz/agents/missions/<missionId>.json
.matriz/agents/handoffs/<handoffId>.json
.matriz/agents/evidence/<evidenceId>.json
```

The existing Workbench filesystem repository remains the only persistence adapter. Domain schemas and invariants remain app-local; presenters map all entities to view models before UI use. The Workbench remains the only owner. Control may later consume a deliberately versioned summary, but phase 1 adds no cross-app contract.

## UI and flow

Add `/team` to Workbench navigation. The page shows a presenter-produced team snapshot: profiles, missions grouped by status, requested human decision and latest evidence. It supports only server-side, local writes for creating profiles, creating a mission, recording a handoff, recording evidence and reviewing completion. It does not expose shell, source editing or agent execution.

The first seeded profiles are `nilo-builder` (scoped code missions) and `zara-link` (context and handoffs). Seeds are templates written only when the team directory is initialized; user-edited profiles are never overwritten.

## Safety rules

- A mission path must be relative, normalized, non-empty and cannot escape the selected project.
- Capability ids are labels for review, not executable permissions.
- No actor can mark its own mission completed; completion requires a human reviewer id and decision.
- Unknown profile ids, invalid transitions, missing evidence and stale revisions fail closed.
- MCP stays read-only for this domain in phase 1; no new MCP write tools.

## Testing and acceptance

Unit tests cover schemas, invalid path rejection, transition rules and completion evidence/reviewer requirements. Repository tests cover atomic persistence and profile initialization without overwrite. Presenter tests cover only view models. Route tests cover reads and approved local writes. The app test, lint and typecheck must pass, plus `pnpm test:smoke` and boundary verification.

## Deferred

No autonomous scheduling, multi-machine coordination, external identity, remote memory, direct Codex dispatch, payment, or authority propagation is in this phase. Those require evidence from two real consumers before any shared runtime extraction.
