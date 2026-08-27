# ADR 0002 — Matriz Ops, Matriz Pay and wallet boundary

Status: accepted — 2026-08-25

## Decision

Introduce `matriz-ops` as the internal administrative client and `matriz-pay` as the sole financial authority. Ops calls Pay through authenticated, versioned HTTP contracts. Core user IDs are opaque references in Pay and there are no cross-schema foreign keys.

Wallet balances are derived from immutable double-entry postings. MTRZ units and BRL cents are integers. Corrections are compensating transactions; hard delete and direct balance edits are forbidden.

## Why

Administrative workflows and financial custody have different security, audit and availability requirements. The boundary limits blast radius and lets Pay evolve independently.

## Impact

`@matriz/integration-wallet-contracts` contains DTOs only because Ops and Pay are real consumers. Financial rules remain app-local in Pay. Matriz Admin is not modified.
