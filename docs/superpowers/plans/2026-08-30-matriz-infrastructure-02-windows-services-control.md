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

## Implementação entregue

- Catálogo app-local fechado em `src/modules/infrastructure/domain/service-catalog.ts`.
- Artefatos Garnet e NATS fixados por versão, tamanho e SHA-256; PostgreSQL é
  aceito somente na major 17 instalada em `Program Files`.
- Host Electron consulta SCM e listeners reais, classifica ownership e nunca
  recebe executável, argumentos, URL, porta ou nome de serviço do renderer.
- `infrastructure.status`, `infrastructure.logs`, `infrastructure.action.preview`
  e `infrastructure.action.confirm` formam a superfície IPC fechada. Toda ela é
  proibida no canal MCP.
- Preview cria token vinculado à ação por 30 segundos e confirmação consome o
  token antes de executar.
- Helper elevado instala em staging, valida artefatos, registra delayed start,
  contas virtuais, ACLs por SID e receipt. O PostgreSQL externo em `5432` nunca
  aparece no catálogo nem no helper.
- `/infrastructure` contém as oito áreas previstas; a web é read-only e
  `/environments` consome um resumo do host no desktop.

## Evidências do gate de código

- 73 arquivos / 283 testes do Control passaram durante a implementação.
- Typecheck web + desktop e lint passaram.
- Parser PowerShell do helper: sem erros.
- Instalação real permanece uma operação humana explícita no cockpit, pois abre
  UAC e altera serviços persistentes da máquina. O gate integrado registra o
  snapshot de `5432` antes/depois e o receipt da instalação.
