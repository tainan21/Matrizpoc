# AGENTS.md — Wallet Contracts

## Responsibility

Versioned transport DTOs shared by Matriz Ops and Matriz Pay.

## Allowed

- Zod schemas, inferred DTO types, error codes and contract versions.
- Currency amounts serialized as integer minor-unit strings.

## Forbidden

- Ledger, balance, authorization, PSP or reconciliation business rules.
- Imports from any app.
- Provider credentials or provider-specific payloads.
