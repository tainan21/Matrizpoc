# Collaboration adapters

Phase 7 adds remote collaboration as an optional projection. It does not move
the source of truth away from Git and `.matriz/**`.

## Current boundary

`DeliveryProvider` is the app-local outbound port. A provider receives a
deterministic draft and returns an external identifier and URL.

The first projection is GitHub issue drafting:

- task title, description and criteria become issue content;
- priority, project and tags become labels;
- a hidden marker carries task id and revision;
- the idempotency key prevents accidental duplicates;
- no GitHub token or API dependency is loaded by the Workbench;
- publication is handed to the optional GitHub Codex plugin and still asks
  before writing.

Open `/projects/<project>/collaboration/github` to inspect and copy drafts.
After an approved publication, paste the returned issue URL on the same page.
The Workbench stores a bounded receipt under
`.matriz/integrations/github/issues/<task-id>.json`, appends an activity event
and renders the external link. Receipt writes use revision checks and accept
only direct HTTPS issue URLs on `WORKBENCH_GITHUB_HOST` (default:
`github.com`).

## Canonical ownership

- Workbench owns planning state.
- Git owns history and portability.
- GitHub owns the published issue/PR representation.
- An external receipt may link back to GitHub, but never replaces the task.

The adapter must not infer that a closed issue means a completed task. A human
or approved reconciliation workflow reviews acceptance evidence first.

## Delivery evidence

Completed agent requests with successful checks can receive two additional,
bounded receipts:

- `.matriz/integrations/github/pull-requests/<request-id>.json`;
- `.matriz/integrations/vercel/previews/<request-id>.json`.

The Workbench records, but does not publish, these artifacts. Pull requests are
restricted to direct HTTPS URLs on the configured GitHub host. Preview URLs are
restricted to `*.vercel.app` by default, or exactly
`WORKBENCH_VERCEL_PREVIEW_HOST` when configured. A preview must identify the
same immutable commit as its linked pull request.

The task evidence view joins agent request, Codex run, checks, changed files,
issue, pull request and preview without copying provider content into canonical
planning records.

## Notification outbox

Each initialized project can opt into Slack and/or Teams projections from
`/projects/<project>/collaboration/notifications`. Configuration and queued
records live under `.matriz/integrations/notifications/**`.

- disabled by default;
- explicit event and channel selection;
- summary, file and URL redaction policy;
- one idempotency key per event and channel;
- atomic writes and optimistic revision checks;
- bounded retry schedule and cancellation;
- no webhook, OAuth token or provider secret is stored in `.matriz`.

The provider-neutral dispatcher now owns the truthful lifecycle
`queued -> delivering -> delivered/failed`. Attempts increment only on a real
claim; provider failures are sanitized and retain the local record; a retry is
idempotent and does not inflate the counter. An item becomes `delivered` only
after the provider returns a validated receipt.

Slack and Teams remain intentionally disconnected. Fake-provider tests prove
the contract without network or secrets. The adapter requirements, timeout and
failure drill are specified in `docs/NOTIFICATION-PROVIDER-CONTRACT.md`.

## Next adapters

1. Approved `GitHubDeliveryProvider`: publish and record without manual paste
   when a write-capable connector is available.
2. One approved notification adapter: emit queued notices to the selected
   channel using externally managed credentials and the proven dispatcher.
3. Remote state adapter: optional authenticated collaboration server while
   preserving the file adapter for export, recovery and offline use.

Multi-user identity, comments and conflict resolution require a real auth and
remote persistence design. They are intentionally not simulated with local
cookies or JSON files.
