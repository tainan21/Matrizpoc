# Seumei

Aplicação web multitenant da Seumei no ecossistema Matriz. A primeira fatia funcional cria ou seleciona uma empresa autorizada, persiste tenant e membership OWNER, retoma o onboarding e abre o workspace real.

## Desenvolvimento

```powershell
corepack pnpm --filter @matriz/app-seumei dev
corepack pnpm --filter @matriz/app-seumei test
corepack pnpm --filter @matriz/app-seumei lint
corepack pnpm --filter @matriz/app-seumei typecheck
corepack pnpm --filter @matriz/app-seumei build
```

Porta: `3008`. O Matriz Hub em `3000` fornece a sessão de desenvolvimento.

Configure `CORE_DATABASE_URL` e `SEUMEI_DATABASE_URL`, ou uma `DATABASE_URL` comum. Sem configuração, a aplicação exibe indisponibilidade explícita e não constrói clientes com URLs placeholder. Não versione `.env`.

## Persistência e autoridade

- `prisma/schemas/core.prisma`: usuário, tenant, registro do app e membership.
- `prisma/schemas/seumei.prisma`: empresa, onboarding e preferências Seumei.
- A criação coordena as duas persistências com idempotência e compensação; não presume transação ACID cross-schema.
- O navegador envia `companyId` apenas para seleção. Toda leitura/mutação deriva o tenant depois de validar membership no servidor.
- O progresso nunca usa `localStorage` como banco e continua após refresh ou nova sessão.

## Rotas atuais

- `/`: lista/cria empresas autorizadas.
- `/onboarding`: configuração persistente e retomável.
- `/workspace`: empresa ativa após conclusão.
- `/api/companies`, `/api/company-selection`, `/api/onboarding`: fronteiras HTTP app-local.

Consulte `docs/AGENT-START-HERE.md` para continuar e `../../docs/seumei-migration-ledger.md` para o mapa de assimilação.
