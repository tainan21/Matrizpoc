# ADR 0005 — Matriz Local Infrastructure V1

## Status

Aceita em 2026-08-30. Implementação sequencial; cada gate deve distinguir
capacidade entregue de alvo ainda pendente.

## Decisão

O Control administra exclusivamente `MatrizPostgres17`, `MatrizGarnet` e
`MatrizNats`. O PostgreSQL usa `127.0.0.1:55432`, database `matriz` e oito
schemas de ownership único. O serviço externo em `5432` é `external_unowned`.

Contratos em `apps/<app>/infrastructure.json` descrevem requisitos sem valores.
Roles de runtime/migration não cruzam schemas. Core é acessado por API do
Identity. Contexto tenant é server-side e aplicado com `SET LOCAL`. Pay é
`global-user`; Ops é `operator-global`.

## Consequências

- serviços persistem além do ciclo de vida do Control;
- operações destrutivas exigem preview, backup de guarda e confirmação única;
- cloud, importação de bancos existentes e PgBouncer ficam fora;
- separar domínio no futuro muda endpoints/credenciais, não ownership lógico;
- Statement Mode é incompatível com o contrato de contexto tenant.

## Rollback

Parar os serviços Matriz, restaurar o último backup validado e reinstalar o
catálogo anterior. Nunca manipular o serviço ou data directory de `5432`.
