# Matriz Capability Platform

Status: primeira fundação funcional, com persistência demo e schema Postgres preparado.

## Fronteiras

- `@matriz/design-system` possui o registry CSS-first, tokens e compatibilidade.
- `@matriz/flows-themes` resolve preferência, recomendação e fallback sem conhecer UI ou banco.
- `@matriz/flows-praticies` possui catálogo, instalação, recentes e layout determinísticos.
- `integration-api-contracts/v1` descreve os DTOs públicos.
- Matriz Hub possui marketplace demo, entitlement, atividade, API e projeções app-locais em modo demonstração.
- Apps consomem somente contratos públicos; nenhum importa `apps/matriz-hub/src/**`.

## Aparência

Temas são código versionado. O banco armazena apenas `themeKey`, versão, preferência, recomendação e entitlement. A resolução é:

1. preferência pessoal desbloqueada e compatível;
2. Matriz Base do app;
3. primeiro tema compatível como fallback técnico.

O tema da organização é sugestão, não imposição. CSS arbitrário nunca é recebido pela API ou persistido.

## Autoridade e degradação

O Hub resolve usuário e tenant por cookie opaco vinculado à requisição; sessões mock concorrentes não compartilham autoridade. IDs enviados pelo cliente não são aceitos como autoridade. A superfície pública canônica é `/api/v1/capabilities/**`; rotas sem versão permanecem apenas como compatibilidade transitória. Com Postgres, os repositories deverão usar os modelos `Capability*` do schema Hub. Sem banco, o adaptador demo em memória é explicitamente efêmero. Apps permanecem operáveis com seus temas e stores locais.

## Extensão

Para incluir um design system novo, adicione uma `ThemeDefinition` ao registry, declare versão e apps compatíveis, forneça tokens semânticos e cubra fallback em teste. A futura biblioteca de 74 sistemas entra por esse processo; não exige coluna ou migration por tema.
