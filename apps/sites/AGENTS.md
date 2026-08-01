# AGENTS.md — Matriz Sites

## Boundaries

- Configuração de sites vive em `sites/**`.
- Renderer e validações vivem no app, não em packages antecipados.
- Não importe internals de outros apps.
- Não trate `.matriz/**` como configuração publicada do site.
- Mudanças de metadata devem preservar locale, canonical, robots e assets.

## Validation

- `pnpm --filter @matriz/app-sites test`
- `pnpm --filter @matriz/app-sites lint`
- `pnpm --filter @matriz/app-sites typecheck`
- `pnpm --filter @matriz/app-sites build`
