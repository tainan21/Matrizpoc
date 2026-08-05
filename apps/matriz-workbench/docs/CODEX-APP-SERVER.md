# Codex App Server integration

Phase 6 embeds local Codex threads without making the OpenAI API, a database or
the TypeScript SDK runtime dependencies of the Workbench.

Official protocol reference:
[Codex App Server](https://learn.chatgpt.com/docs/app-server.md).

## Runtime selection

The server resolves the executable in this order:

1. `WORKBENCH_CODEX_BIN`, when it is an absolute existing file;
2. the Codex plugin app-server runtime at
   `%USERPROFILE%\.codex\plugins\.plugin-appserver\codex.exe`;
3. the Codex Desktop runtime at
   `%LOCALAPPDATA%\OpenAI\Codex\bin\codex.exe`;
4. `codex`/`codex.cmd` from `PATH`.

This order is intentional. The user-level npm shim can be broken independently
from Codex Desktop, while the plugin app-server runtime is versioned for the
current app-server protocol.

The Workbench never edits `~/.codex/config.toml`. An incompatible profile or
runtime becomes a failed run with a visible diagnostic.

## Security contract

- Threads start with `sandbox: read-only`.
- Network access starts disabled.
- Commands and file changes that need more authority become explicit approval
  cards in the UI.
- Approval can be one-shot, session-scoped, declined or cancelled.
- Unsupported server requests fail closed.
- The browser can call Codex routes only from an unlocked
  `http://127.0.0.1:3005` session with a matching `Origin`.
- The Workbench does not expose shell or filesystem primitives as HTTP APIs.
- Starting, cancelling and approving always require an explicit user action.
- The App Server subprocess receives only a small operating-system environment
  allowlist. Workbench tokens and provider credentials are not inherited.

The preferred bundled runtime authenticates through the user's local Codex
profile. `WORKBENCH_LOCAL_TOKEN`, `OPENAI_API_KEY`, `GITHUB_TOKEN` and other
unrelated parent-process values are intentionally excluded from the child
environment.

## Lifecycle

1. A human creates an `AgentRequest`.
2. `CodexRunManager` claims it and moves it to `in_progress`.
3. The manager builds the compact context bundle.
4. App-server starts or resumes a thread with the selected app as `cwd`.
5. A turn streams plan, messages, commands, file changes and unified diff.
6. Coarse run state is persisted in
   `apps/<app>/.matriz/agents/runs/<request-id>.json`.
7. A successful turn requires at least one command with exit code zero.
8. The request is completed and becomes available for human review. The linked
   work item's product state is not changed automatically.
9. A failed turn becomes `blocked`; a user interruption becomes `cancelled`.

Run files are snapshots, not a second source of task truth. Backlog and agent
request files remain canonical.

An execution may provide checks, changed files, a diff and a result summary.
Those artifacts support review but do not mean that validation, documentation
or product completion was approved. Only a human can update those governance
states in the operational board.

The request detail and the linked work-item detail expose an explicit human
review. Approving or requesting changes records a decision on the
`AgentRequest` and the exact persisted run revision. This review does not move
the request out of `completed`, does not update the linked work item and does
not approve product validation. If the run snapshot later changes, the review
is shown as stale and must be repeated.

## HTTP surface

- `GET /api/codex/runtime`
- `POST /api/codex/projects/:project/requests/:request/start`
- `GET /api/codex/projects/:project/requests/:request/events`
- `POST /api/codex/projects/:project/requests/:request/cancel`
- `POST /api/codex/projects/:project/requests/:request/approvals/:approval`

SSE streams snapshots and closes when the local app-server connection ends.
A persisted snapshot remains readable after a restart. Retrying a blocked run
resumes the recorded Codex thread and starts a new turn.

## Verified local proof

On 2026-07-28 the integration created:

- request `req_248f3d00-aebf-4b51-ae81-bb84a185ed9c`;
- thread `019faa8f-419f-7780-8ea5-76d7f34900ed`;
- turn `019faa8f-5322-7992-9da1-b1a1c490be43`.

The turn read `package.json`, executed one read-only verification, returned
`@matriz/app-matriz-workbench`, changed no files and completed successfully.
