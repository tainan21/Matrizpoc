# Matriz Local Infrastructure V1 — Design

## Objetivo

Entregar uma stack local permanente, restaurável e administrada pelo Matriz
Control, sem tocar no PostgreSQL externo em `5432` e sem criar recursos cloud.

```text
Matriz Control Desktop
├── MatrizPostgres17  127.0.0.1:55432 → matriz/{core,hub,spot,seumei,contracts,willdash,ops,pay}
├── MatrizGarnet      127.0.0.1:46379
└── MatrizNats        127.0.0.1:54222
    └── monitoring    127.0.0.1:58222
```

Serviços usam Automatic (Delayed Start), contas virtuais restritas e continuam
ativos após fechar o Control. Binários/config/data/log ficam em
`%ProgramData%\Matriz\Infrastructure`; vault, preferências e recibos em
`%LOCALAPPDATA%\Matriz\Control`.

## Autoridade e isolamento

- Ownership e acessos: `docs/infrastructure/domain-ownership-matrix.md` e
  `docs/infrastructure/access-matrix.md`.
- Infrastructure Contracts são descoberta; não contêm valores ou comandos.
- O renderer envia apenas action IDs. O host resolve catálogo, paths e args.
- `5432` e serviços sem fingerprint Matriz são `external_unowned`.
- Runtime/migration roles acessam apenas o schema próprio; apps consultam Core
  somente pela API do Identity.
- Tenant vem de sessão/token validado; request input nunca confere autoridade.
- Toda operação tenant-owned ocorre em transação com
  `SET LOCAL matriz.tenant_id` e RLS forçada.
- Pay é global-user; Ops é operator-global.

## Ciclos de dados

Migration: inventário → drift/checksum → preview → backup de guarda → confirmação
única → migration authority → release marker → health gate.

Restore: validar manifest/checksum → restaurar em database temporário → validar
schemas/roles/ACL/RLS/migrations → trocar database → manter anterior em
quarentena até confirmação.

Evento: transação de domínio + outbox → publisher com ACK JetStream → inbox +
efeito na mesma transação → ACK → pruning seguro.

## Segurança e evolução

O threat model está em `docs/infrastructure/threat-model.md`. O futuro cloud ou
separação física altera endpoints e credenciais, mantendo ownership e contratos.
PgBouncer futuro deve usar Transaction Mode. Blob, vetores, GraphRAG e clusters
especiais ficam fora desta V1.
