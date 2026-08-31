# Matriz Client Admin

## Escopo

Este app é a experiência client-facing. Ele não possui banco, não é dono das projeções e nunca acessa Prisma. Toda leitura vem dos contratos `/api/client-admin/v1/*` do Matriz Hub.

## Rotas

- `/`: visão geral, métricas e atenção
- `/systems`: catálogo e saúde
- `/site`: site e analytics
- `/payments`: projeções administrativas
- `/integrations`: fontes e sincronização

## Camadas e limites

- `app/`: composição de rotas e boundaries.
- `src/server`: sessão OIDC e carregamento server-side.
- `src/integration`: cliente do contrato Hub e cache local tenant-scoped.
- `src/presentation`: ViewModels; a UI não recebe entidades do Hub.
- `src/ui`: componentes de apresentação.
- `desktop`: launcher Tauri; somente uma origem HTTPS fixada no build em produção.

Não importe internals de outro app. Não acrescente domínio a packages. Estados válidos são `fresh`, `stale`, `empty`, `not_configured`, `unavailable` e `error`; dado desconhecido nunca vira zero.

## Checklist

1. `corepack pnpm --filter @matriz/app-client-admin test`
2. `corepack pnpm --filter @matriz/app-client-admin lint`
3. `corepack pnpm --filter @matriz/app-client-admin typecheck`
4. `corepack pnpm --filter @matriz/app-client-admin build`
5. Verificar navegação sem sessão, sem Hub e com respostas parciais.
6. Verificar desktop e mobile; ícones ambíguos precisam de rótulo acessível.
