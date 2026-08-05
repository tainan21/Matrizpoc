# Notification provider contract

## Purpose

The notification outbox is an optional projection of local planning events.
Git and `.matriz/**` remain canonical. A provider outage must never roll back,
block or alter the task, agent request or Codex run that produced the event.

`NotificationProvider` is the app-local outbound port. Implementations may
target Slack or Microsoft Teams, but provider SDKs, credentials and response
formats must remain behind that port.

## Delivery lifecycle

```text
queued -> delivering -> delivered
                     \-> failed -> queued (human retry)
queued/failed -> canceled
```

- `attempts` increments only when an item is claimed for a real delivery.
- claim, success, failure, retry and cancellation require the current revision.
- a successful delivery stores only a bounded message id and optional HTTPS URL.
- failures preserve the item, sanitize the error and schedule bounded
  exponential backoff.
- a local claim without a receipt is recovered as `failed` after two minutes;
  recovery does not count a second attempt.
- a delivered or canceled item is terminal and cannot be delivered again.
- provider absence leaves the item queued and does not count as an attempt.

The local dispatcher processes the oldest due item that has an available
provider. Each call handles at most one record. This bounds work and makes
shutdown and operational inspection predictable.

## Provider responsibilities

An adapter must:

1. accept the already-redacted `NotificationOutboxItem`;
2. use `idempotencyKey` as its deduplication key whenever the provider supports
   one, or persist an equivalent provider-side marker;
3. enforce a bounded network timeout and treat ambiguous timeouts as
   retry-safe;
4. return only `providerMessageId` and an optional direct HTTPS
   `providerUrl`, without URL credentials;
5. throw a concise operational error without tokens, request bodies or personal
   paths;
6. keep OAuth tokens, webhook URLs and refresh credentials outside
   `.matriz/**`, activity logs and browser responses;
7. never mutate canonical Workbench records directly.

The dispatcher also applies a defensive timeout (10 seconds by default, bounded
to 1–30 seconds). Because a timed-out remote request can still complete, remote
idempotency is mandatory before enabling production delivery.

## Secret boundary

No provider secret is accepted by the current Workbench configuration or file
protocol. A future adapter must obtain a short-lived, scoped credential from an
approved runtime secret store or connected Codex plugin. It must not expose that
credential to React components, MCP resources, JSON files, JSONL activity or
provider error text.

Slack and Teams remain disconnected until one channel is explicitly selected,
connected and reviewed. The local dispatcher and fake-provider tests prove the
state machine without requiring either service.

## Failure drill

Before enabling a real adapter:

1. deliver one item and verify one immutable provider receipt;
2. repeat dispatch and verify the delivered item is not sent again;
3. simulate a provider 5xx response and verify `failed`, sanitized error and
   `nextAttemptAt`;
4. retry the item and verify `attempts` reflects actual sends;
5. simulate a timeout where the provider completes late and verify the
   idempotency key prevents a duplicate;
6. disconnect credentials and verify canonical local work continues;
7. rotate/revoke the credential and verify no secret exists in Git history,
   `.matriz/**`, activity or UI responses.

## Known local limitation

Revision checks protect normal single-process use but the file adapter is not a
distributed lease. Multiple operating-system processes could race between read
and rename. A remote multi-user dispatcher therefore requires a transactional
queue or lease in the future 7D persistence adapter; it must not reuse the local
filesystem claim as a distributed lock.
