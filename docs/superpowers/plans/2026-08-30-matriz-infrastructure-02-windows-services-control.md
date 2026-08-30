# Plano 2 — Serviços Windows e cockpit

## Entregas

- Catálogo fixo PostgreSQL 17.x, Garnet 2.1.5 e NATS 2.14.5 com origem, tamanho,
  SHA-256 e assinatura quando disponível.
- Bridge Electron tipado: status/install/start/stop/restart/logs, preview e
  confirmação de uso único; web permanece read-only.
- Fingerprint de ownership impede adoção/parada de serviço externo.
- SCM instala `MatrizPostgres17`, `MatrizGarnet`, `MatrizNats` com delayed start,
  loopback-only, contas virtuais e ACL para o SID instalador.
- `/infrastructure`: Overview, Database, Cache, Events, Backups, Migrations,
  Contracts e Logs; `/environments` consome o resumo.

## Testes e gate

Parser/fingerprint/redaction, IPC deny-by-default, token único, rollback de
instalação atômica e lifecycle real. Registrar estado de `5432` antes/depois.
Saída: fechar Control não para serviços; serviço externo nunca é mutado.
