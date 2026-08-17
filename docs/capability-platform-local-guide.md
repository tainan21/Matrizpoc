# Guia local — Capability Platform

## Execução rápida

1. Instale dependências com `pnpm install`.
2. Inicie o Hub na porta 3000 e os apps desejados com os scripts existentes; use sempre o host canônico `localhost`.
3. Entre pelo Hub; os demais apps restauram a mesma sessão mock local.
4. Abra `/settings/appearance` para testar Base, checkout demo e ativação.
5. Abra `/praticies/apps`, instale uma utilidade e confirme o estado no Workbench em `/praticies`.

Sem `HUB_DATABASE_URL` utilizável, a capability API informa modo `demo`: os dados duram somente enquanto o processo do Hub está vivo. Se o Hub estiver offline, cada app preserva sua aparência e Praticies usa o armazenamento local existente.

## Postgres

O schema está em `prisma/schemas/hub.prisma`. Valide com `pnpm prisma:validate:hub`. A criação e aplicação de uma migration real ficam condicionadas a uma instância Postgres reproduzível; não use `db push` como substituto de histórico versionado.

## Prova manual

- Entrar no Hub e observar a home operacional.
- Abrir Aparência; concluir checkout claramente demonstrativo de Midnight Graphite ou Aurora.
- Aplicar o tema e abrir outro app compatível.
- Confirmar fallback em um app incompatível.
- Instalar Release Notes no Hub e confirmar no Workbench.
- Derrubar o Hub e confirmar que os apps continuam legíveis com seus temas locais.

## Limitações atuais

- autenticação central é mock local;
- o adapter Prisma da Capability Platform ainda é backlog;
- checkout não cobra e não integra Stripe;
- recomendações são determinísticas e iniciais;
- publicação remota e geração automática de presets não fazem parte desta fase.
