# Capability Platform — relatório compacto

## Página 1/3 — objetivo, arquitetura e avanço

- Objetivo: transformar Hub e Praticies em uma base reutilizável de instalação, aparência, entitlement, recentes e futuras recomendações.
- Resultado esperado: um novo app adota temas compartilhados usando o shell comum, sem importar internals de outro app.
- Entregue: registry CSS-first, Matriz Base, temas experimentais, compatibilidade, fallback e preferência pessoal acima da recomendação organizacional.
- Entregue: flow puro de temas, contratos API V1, actor context no servidor e allowlist local para os sete apps.
- Entregue: schema Hub para catálogo, instalações, uso, recentes, layout, preferências, acessibilidade, entitlements, pedidos demo e eventos.
- Entregue: dashboard editorial operacional, configurações de aparência e checkout explicitamente demonstrativo.
- Entregue: Praticies com `iconKey`, estado central demo, fallback local e integração Hub/Workbench.

---

## Página 2/3 — features, qualidade e limites

- Temas continuam versionados em código; banco nunca recebe CSS arbitrário.
- Organização recomenda tema; pessoa escolhe se deseja aplicar.
- Entitlement pode pertencer à pessoa ou tenant; compra de tenant exige owner/admin.
- Base permanece disponível mesmo sem entitlement ou Hub.
- Eventos cobertos no corte: compra/ativação de tema e instalação/remoção/abertura de Praticies.
- Testes cobrem precedência, compatibilidade, fallback, entitlement e workspace de Praticies.
- Validado até aqui: testes dos flows/design/Hub, typecheck dos packages compartilhados, Hub e Workbench, e validação do schema Prisma.
- Limites: store demo é efêmero, auth continua mock e não há cobrança real.

---

## Página 3/3 — backlog, progresso e próximos passos

- Próximo: implementar repository Prisma da Capability Platform e migration reproduzível.
- Próximo: substituir localStorage crítico de Praticies após a prova Postgres multi-sessão.
- Próximo: persistir preferências de acessibilidade e recomendação administrativa.
- Próximo: expandir eventos, retenção e motor determinístico de recomendações.
- Próximo: validar visualmente os sete apps em mobile, tablet, desktop e TV.
- Futuro: sessão Core real, Stripe, publicação remota e importador da biblioteca de 74 design systems.
- Progresso: fundação funcional em validação; itens persistentes permanecem pendentes até evidência Postgres.
- Governança: nenhuma pontuação do roadmap foi alterada; a iniciativa permanece ativa e revisável.
