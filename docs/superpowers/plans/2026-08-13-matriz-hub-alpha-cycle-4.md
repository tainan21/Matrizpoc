# Matriz-Hub Alpha — Ciclo 4: ambiente de conhecimento

## Escopo

Transformar as 24 rotas existentes de `apps/matriz-hub/app/docs` sem alterar repositórios, autorização, APIs ou contratos do MatrizDocs.

## Estratégia

1. Introduzir um shell local de conhecimento com navegação rasa, orientação e áreas de trabalho persistentes.
2. Evoluir os presenters para traduzir status e eventos técnicos em linguagem humana com termo técnico secundário.
3. Reescrever os componentes compartilhados do MatrizDocs como superfícies densas, não como uma coleção de cards.
4. Reorganizar biblioteca, documento, revisão e grafo com hierarquia espacial; as rotas secundárias herdam o mesmo shell e os mesmos primitives.
5. Preservar formulários, ações POST, dados Prisma, MCP, timeline, exports, governance e estados de indisponibilidade.

## Validação

- Testes de presenter antes da implementação visual.
- `typecheck` e `lint` apenas do Matriz-Hub.
- QA real nas rotas `/docs`, `/docs/review-desk`, `/docs/graph`, `/docs/context` e em viewport móvel.
- Confirmar ausência de overflow, foco visível e fallback honesto sem banco.
