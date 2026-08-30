# Runbook — PostgreSQL Matriz local

## Identidade do cluster

- Serviço: `MatrizPostgres17`
- Endpoint: `127.0.0.1:55432`
- Database: `matriz`
- Schemas: `core`, `hub`, `spot`, `seumei`, `contracts`, `willdash`, `ops`, `pay`
- Data: `%ProgramData%\Matriz\Infrastructure\postgres\data`

Nunca use este runbook contra `5432`. Toda ferramenta V1 rejeita host diferente
de `127.0.0.1`, porta diferente de `55432` e database fora do catálogo.

## Autoridades

`matriz_provisioner` existe somente para topologia e recuperação. Cada domínio
possui `matriz_<schema>_migration` e `matriz_<schema>_runtime`. Runtime não é
membro de outra role, não migra e não possui `USAGE` em outro schema.
Credenciais geradas ficam protegidas por DPAPI no vault do instalador.

## Migrations

1. Leia o ledger e bloqueie em `failed`, `drifted` ou checksum alterado.
2. Gere preview das migrations pendentes.
3. Faça backup de guarda válido.
4. Confirme com token de uso único.
5. Execute `prisma migrate deploy` separadamente por migration role.
6. Execute `prisma migrate diff`, release marker, ACL e RLS.
7. Só então libere apps gerenciados.

Migration nunca roda em start do banco ou do app. Arquivo aplicado é imutável;
correção entra numa migration nova.

## RLS

O tenant vem do contexto de autorização resolvido no servidor. A transação usa
`SELECT set_config('matriz.tenant_id', $1, true)`, equivalente a `SET LOCAL`.
Body, query e headers públicos são dados não confiáveis. `SET` sem escopo local
é proibido.

Ops é operator-global. Pay é global-user. Não adicione `tenantId` artificial a
esses domínios para reutilizar policies tenant.

## Backup e restore

O formato aprovado é `pg_dump -Fc` do database inteiro, acompanhado de manifest
V1 com versão PostgreSQL, migrations, oito schemas, tamanho e SHA-256. Restore
sempre ocorre primeiro em `matriz_restore_<id>`; validações de migrations,
topologia, ACL e RLS precisam passar antes do corte. A base anterior entra em
quarentena e roles/secrets são reprovisionados, nunca restaurados do dump.

O Desktop aceita somente IDs `backup_YYYYMMDD_<suffix>` presentes no catálogo;
o renderer nunca fornece paths. Cada restore verifica manifest, tamanho,
SHA-256 e catálogo do `pg_restore`, restaura em `matriz_restore_<suffix>`,
valida os oito schemas e índices e só então promove. A base anterior permanece
como `matriz_quarantine_<timestamp>`.

O instalador registra `MatrizDatabaseDailyBackup` às 03:00 sob o usuário
instalador. Backups diários válidos e não fixados retêm os sete mais recentes;
backups de guarda, fixados e evidências inválidas nunca são podados. O Control
oferece backup de guarda, restore e recreate apenas no Desktop, sempre com
preview e token de confirmação de uso único por 30 segundos.

## Seed local

Depois de migrations e health gate verdes, execute `pnpm matriz:seed:dev` com
`MATRIZ_ENVIRONMENT=local` e as oito URLs server-only fornecidas pelo vault apontando para
`127.0.0.1:55432/matriz?schema=<schema>`. O comando é idempotente e falha antes
de conectar caso qualquer URL aponte para `5432`, cloud, `localhost` ou outro
database. Use somente dados sintéticos; o seed não importa ambientes antigos.
