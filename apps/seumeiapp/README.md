# Seumei

Aplicação web multitenant da Seumei no ecossistema Matriz. O fluxo funcional cria ou seleciona uma empresa autorizada, persiste tenant e membership OWNER, retoma o onboarding, abre o workspace real, administra a equipe e mantém um catálogo real de categorias, produtos e variantes.

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

- `prisma/schemas/core.prisma`: usuário, tenant, registro do app, membership e convites app-scoped.
- `prisma/schemas/seumei.prisma`: empresa, onboarding, preferências e catálogo Seumei.
- A criação coordena as duas persistências com idempotência e compensação; não presume transação ACID cross-schema.
- O navegador envia `companyId` apenas para seleção. Toda leitura/mutação deriva o tenant depois de validar membership no servidor.
- O progresso nunca usa `localStorage` como banco e continua após refresh ou nova sessão.
- Convites persistem somente o hash do token, expiram, são vinculados ao e-mail autenticado e viram membership em transação Core.
- OWNER é imutável; ADMIN gerencia MEMBER/VIEWER; MEMBER e VIEWER não recebem mutações administrativas.
- OWNER/ADMIN alteram o catálogo; MEMBER/VIEWER consultam. Slugs, SKUs e queries são tenant-scoped e preços usam centavos inteiros.

## Rotas atuais

- `/`: lista/cria empresas autorizadas.
- `/onboarding`: configuração persistente e retomável.
- `/workspace`: empresa ativa após conclusão.
- `/workspace/members`: diretório, convites e gestão autorizada de papéis.
- `/workspace/products`: lista real; `/new` e `/[productId]` criam e retomam produtos com variantes.
- `/docs`: laboratório temporário autenticado para visualizar e desenhar route flows; não é persistência empresarial.
- `/invite/[token]`: inspeção e aceitação segura do convite, preservando retorno pelo login.
- `/api/companies`, `/api/company-selection`, `/api/onboarding`, `/api/members`, `/api/invitations/accept` e `/api/catalog/**`: fronteiras HTTP app-local.

Consulte `docs/AGENT-START-HERE.md` para continuar e `../../docs/seumei-migration-ledger.md` para o mapa de assimilação.
