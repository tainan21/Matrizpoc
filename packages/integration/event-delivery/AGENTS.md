# Event Delivery

Neutral infrastructure for durable outbox publication and JetStream transport.

- Accept domain-owned repositories and declared event names through interfaces.
- Never import app internals, Prisma clients, manifests or product schemas.
- Never decide tenant authorization; `tenantId` in an envelope is routing metadata.
- Keep credentials and environment parsing app-local.
