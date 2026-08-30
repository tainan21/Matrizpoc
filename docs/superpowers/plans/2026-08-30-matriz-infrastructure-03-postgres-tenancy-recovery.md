# Plano 3 — PostgreSQL, tenancy e recuperação

## Entregas

- `initdb` SCRAM, data dir próprio, database `matriz`, oito schemas, roles
  migration/runtime e ACL deny-by-default.
- Contexto server-side com `SET LOCAL`; repositories não aceitam tenant público
  como autoridade. Core somente por API do Identity.
- Drift/checksum/release markers e migrations explícitas com backup de guarda.
- `pg_dump -Fc`, manifest SHA-256, retenção 7 dias, pins, restore temporário,
  quarantine e recreate seguro.
- `matriz seed:dev` idempotente/local-only com usuários, tenant, grants, OIDC,
  MFA, fixtures nos oito schemas e wallets globais sintéticas.

## Testes e gate

Roles/ACL/ownership, RLS forçada, ataque body/query/header, commit/rollback,
pool reuse, drift, backup corrompido e restore parcial. Saída: cluster vazio é
provisionado, migrado, seedado, destruído e restaurado sem tocar em `5432`.
