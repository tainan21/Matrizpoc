# Threat Model — Matriz Local Infrastructure V1

## Ativos e fronteiras

Ativos: dados dos oito schemas, secrets do vault, backups, credenciais OIDC,
ACLs Garnet/NATS e recibos operacionais. Fronteiras: renderer ↔ processo nativo,
Control ↔ Windows SCM, app ↔ Identity API e role ↔ schema PostgreSQL.

## Ameaças e controles

| Ameaça | Controle obrigatório |
| --- | --- |
| Control parar/adotar PostgreSQL externo | fingerprint de serviço/data dir/porta; `5432` sempre `external_unowned` |
| renderer injetar comando/path/URL | IPC usa action IDs; catálogo nativo resolve argumentos; preview e token único |
| tenant spoofing | ignorar autoridade de body/query/header; sessão validada; `SET LOCAL` transacional; RLS forçada |
| vazamento entre conexões | testes após commit/rollback/erro e concorrência; Statement Mode proibido |
| role lateral | NOINHERIT/NOBYPASSRLS; ACL exclusiva; verificação de grants e ownership |
| migration adulterada | checksums Prisma, release marker, drift gate e backup de guarda |
| restore destrutivo/corrompido | SHA-256, restore temporário, validação e base anterior em quarentena |
| secret em Git/log/renderer | vault Windows, exportação explícita, redaction e `.env.example` sem valores |
| cache virar autoridade | TTL obrigatório, namespace/ACL por app, PostgreSQL permanece fonte |
| evento perdido/duplicado | transação + outbox, ACK JetStream, `Nats-Msg-Id`, inbox idempotente e DLQ |
| worker multi-tenant virar super-role | policy explícita só na tabela operacional, `NOBYPASSRLS`, zero grants de negócio e auditoria de ACL |
| tenant do envelope virar autoridade | consumidor valida sessão/serviço e abre nova transação tenant-local; envelope é somente roteamento |
| supply chain de runtime | catálogo fixo, HTTPS/origem, tamanho, SHA-256 e assinatura quando disponível |

## Exclusões conscientes

V1 assume um único usuário Windows instalador. Cloud, múltiplos administradores,
clusters especiais e importação de dados antigos não estão autorizados.
