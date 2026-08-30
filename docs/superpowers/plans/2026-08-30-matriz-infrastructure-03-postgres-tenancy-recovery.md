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

## Incremento 1 — topologia, migrations e RLS

- O setup elevado cria somente `matriz` em `127.0.0.1:55432`, 16 roles sem
  privilégios elevados e exatamente oito schemas. Secrets aleatórios ficam em
  arquivos DPAPI no vault local.
- As oito migrations `202608300001_local_infrastructure_v1` restauram ACLs de
  runtime e default privileges. Nos seis schemas tenant, toda tabela que contém
  `tenantId` recebe RLS habilitada e forçada.
- Ops continua operator-global e Pay global-user, ambos sem falsa policy tenant,
  mas agora com ACL runtime explícita.
- O verificador descobre tabelas tenant-owned, exige RLS forçada, valida a raiz
  `core.tenants` e a matriz exata dos oito schemas.
- O runner da matriz usa Corepack no Windows sem shell e mantém URLs de banco
  somente no environment do subprocesso.
- O ledger classifica `clean`, `pending`, `drifted` e `failed`, incluindo
  checksum alterado e migration inesperada.
- Planos de `pg_dump -Fc` e `pg_restore` aceitam apenas loopback `55432`; restore
  direto sobre `matriz` é rejeitado e secrets não entram em argumentos.

### Evidência descartável

Em PostgreSQL 17.4 local, porta isolada `55439`, passaram zero-state e N−1 para
os oito schemas, `migrate deploy`, `migrate diff`, release marker, ACL/RLS e
limpeza de contexto após commit. O cluster foi parado e removido ao fim; `5432`
permaneceu inalterado. Naquele incremento, recuperação e seed permaneceram
como gates abertos.

## Incremento 2 — backup e recuperação

- O cockpit Desktop cataloga backups sem expor paths e usa comandos IPC
  fechados por action ID e backup ID validado.
- Backup usa `pg_dump -Fc`, escrita temporária, move atômico e manifest V1 com
  versão, oito schemas, tamanho e SHA-256.
- Restore/recreate validam checksum e catálogo, restauram primeiro em database
  temporário, verificam schemas e índices e preservam o database anterior em
  quarentena antes do health gate.
- Tokens de confirmação duram 30 segundos, são vinculados à ação/backup e
  consumidos antes da execução. O backup é relido antes da confirmação.
- A tarefa `MatrizDatabaseDailyBackup` roda sob o usuário instalador; a retenção
  mantém sete diários válidos e nunca poda pins, backups de guarda ou evidência
  inválida.

O seed local, execução privilegiada de migrations pelo cockpit e o teste real
de restore/recreate permanecem como próximos gates do Plano 3.
