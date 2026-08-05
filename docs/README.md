# Documentação do Matriz Infra Hub

Esta pasta contém os contratos canônicos do ecossistema Matriz. Documentos
específicos de produto permanecem dentro do respectivo `apps/<app>/docs`.

## Comece aqui

1. [Guia técnico e operacional](./MATRIZ-TECHNICAL-GUIDE.md)
2. [Leis arquiteturais](./architectural-laws.md)
3. [Estrutura do monorepo](./monorepo-structure.md)
4. [Comunicação entre apps](./app-communication.md)
5. [Criação e integração de projetos](./NEW-PROJECT-GUIDE.md)
6. [Coworking, API e MCP](./COWORKING-API-MCP.md)
7. [Segurança de mudanças](./CHANGE-SAFETY.md)
8. [Registro de decisões](./DECISION-LOG.md)

## Fontes de verdade

| Assunto | Fonte |
| --- | --- |
| Boundaries | `docs/architectural-laws.md` |
| Ownership | `docs/app-ownership-map.md` |
| Packages | `docs/package-categories.md` |
| Contratos entre apps | `docs/app-communication.md` |
| Estado operacional por projeto | `<projeto>/.matriz/**` |
| Instruções de um app | `apps/<app>/AGENTS.md` e `docs/AGENT-START-HERE.md` |
| Scripts executáveis | `package.json` da raiz ou do app |

O roadmap documental do Infra Hub é mantido em
`.matriz/roadmap.json` e visualizado pelo Matriz Workbench. O score é binário:
cada um dos cem outcomes vale `0` ou `1` mediante evidência.

Baseline inicial verificada: `4/100`. Os quatro pontos correspondem ao guia
técnico central, guia operacional, índice canônico e onboarding de novos
projetos/coworking. Os demais pontos permanecem em `0`.
