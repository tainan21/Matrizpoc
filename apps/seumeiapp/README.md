# Seumei

Aplicação web multitenant da Seumei no ecossistema Matriz. O fluxo funcional cria ou seleciona uma empresa autorizada, persiste tenant e membership, retoma onboarding e opera catálogo, receitas, ingredientes, estoque, loja pública simulada, pedidos e clientes reais.

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
- `prisma/schemas/seumei.prisma`: empresa, onboarding, catálogo, receitas, estoque, publicação, clientes e pedidos Seumei.
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
- `/workspace/products/[productId]/recipe`, `/workspace/ingredients` e `/workspace/stock/**`: composição culinária e movimentos persistentes.
- `/store/[storeSlug]` e `/checkout`: loja pública e compra explicitamente simulada com efeitos atômicos.
- `/workspace/orders/**` e `/workspace/customers/**`: operação e relacionamento autorizados.
- `/docs`: laboratório temporário autenticado para visualizar e desenhar route flows; não é persistência empresarial.
- `/invite/[token]`: inspeção e aceitação segura do convite, preservando retorno pelo login.
- `/api/companies`, `/api/company-selection`, `/api/onboarding`, `/api/members`, `/api/catalog/**`, `/api/recipes/**`, `/api/stock/**`, `/api/orders/**`, `/api/customers/**` e `/api/public/v1/stores/**`: fronteiras HTTP app-local.

Consulte `docs/AGENT-START-HERE.md` para continuar e `../../docs/seumei-migration-ledger.md` para o mapa de assimilação.

## Windows shell

Seumei continua **web-first**. O shell Windows é apenas um cliente Electron mínimo que abre a origem web já publicada; ele não inclui Next.js, Prisma, banco de dados, credenciais ou dados de produto.

O build de produção exige `SEUMEI_DESKTOP_APP_URL` e `SEUMEI_DESKTOP_HUB_URL` HTTPS. Essas origens são gravadas no artefato e não podem ser trocadas pelo ambiente da máquina instalada. Desenvolvimento usa somente `http://127.0.0.1:3008` e `http://127.0.0.1:3000`. Não registre essas variáveis em `.env` versionado.

```powershell
corepack pnpm --filter @matriz/app-seumei desktop:dev
corepack pnpm --filter @matriz/app-seumei desktop:compile
corepack pnpm --filter @matriz/app-seumei desktop:package
```

O shell usa a sessão persistente `persist:seumei`, sandbox, isolamento de contexto e sem bridge de preload para conteúdo remoto. Somente Seumei e MyHub configurados abrem dentro do aplicativo; links HTTPS externos são encaminhados ao navegador padrão. Pop-ups, permissões, downloads e esquemas inseguros são negados.

Atualizações NSIS são sempre manuais: verificar, baixar e instalar são três ações separadas no menu, com download e instalação ao sair desativados. O build recebe `SEUMEI_DESKTOP_UPDATE_URL` para gerar `app-update.yml` sem aceitar URL do renderer.

Para gerar uma release assinada, defina `CSC_LINK`, `SEUMEI_DESKTOP_INSTALLER_URL`, `SEUMEI_DESKTOP_RELEASED_AT` e `SEUMEI_STORE_MANIFEST_PRIVATE_KEY` (arquivo PEM Ed25519). `desktop:release` gera `release-manifest.json` no contrato `StorePackageManifestV1` e `release-manifest.json.sig`; o manifesto inclui URL HTTPS, tamanho e SHA-256 do instalador determinístico `seumei-<version>-windows-x64-setup.exe`.
