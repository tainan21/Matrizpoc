# Matriz Client Admin

Admin reutilizável para clientes da Matriz. O primeiro tenant é exibido como **Admin Laudate**, mas nomes, dados e autorizações sempre são derivados da sessão.

## Desenvolvimento

Copie apenas os nomes de `.env.example` para seu vault/ambiente. Nunca versione valores secretos.

```powershell
corepack pnpm install
corepack pnpm --filter @matriz/app-client-admin dev
```

Web: `http://127.0.0.1:3013`. O Hub deve estar em `MATRIZ_HUB_URL`. Sem Hub, banco ou integrações, o shell continua navegável e distingue indisponibilidade de ausência de dados.

## Validação e build

```powershell
corepack pnpm --filter @matriz/app-client-admin test
corepack pnpm --filter @matriz/app-client-admin lint
corepack pnpm --filter @matriz/app-client-admin typecheck
corepack pnpm --filter @matriz/app-client-admin build
```

O `vercel.json` fixa a região `gru1`. Faça preview autenticado antes de promover para produção.

## Desktop Windows

Execute a web local na porta 3013 e, em outro terminal, rode `corepack pnpm --filter @matriz/app-client-admin dev:desktop`. Produção exige `VITE_CLIENT_ADMIN_WEB_ORIGIN=https://...`; o launcher rejeita HTTP e origens arbitrárias. A versão inicial é `0.1.0`, bundle `com.matriz.clientadmin`, tag `client-admin-v0.1.0` e NSIS current-user.

## Dados

O Hub é owner de `ClientPortalSystem`, `ClientPortalDataSource`, `ClientPortalSnapshot` e `ClientPortalPaymentProjection`. Credenciais Vercel/GA4 ficam apenas em env/vault. Pagamentos são projeções de leitura, não ledger.

Consulte [docs/CREDENTIALS-AND-INTEGRATIONS.md](docs/CREDENTIALS-AND-INTEGRATIONS.md) para obter e configurar cada API, identificador e chave de segurança.
