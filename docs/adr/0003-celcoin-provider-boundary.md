# ADR 0003 — Celcoin as replaceable BRL provider

Status: accepted — 2026-08-25

## Decision

Use Celcoin BaaS behind a Pay-local adapter for OAuth, account/KYC, balance, statement, Pix and webhooks. Sandbox is mandatory before production. BRL remains pending until a verified provider event is durably accepted and reconciled.

## Safety constraints

Webhook events use a durable idempotent inbox, signature and replay checks, retry and dead-letter handling. Reconciliation discrepancies block outgoing BRL. Matriz does not create parallel custody or represent itself as a payment institution.
