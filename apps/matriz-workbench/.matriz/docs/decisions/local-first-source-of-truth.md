---
{"schemaVersion":1,"id":"doc_0ea76349-e55e-42f8-98da-1cba79ae4de4","projectId":"matriz-workbench","kind":"decision","slug":"local-first-source-of-truth","title":"Git é a fonte canônica da V1","tags":["arquitetura","local-first"],"createdAt":"2026-07-28T12:00:00.000Z","updatedAt":"2026-07-28T12:00:00.000Z","revision":"decision-v1"}
---
# Contexto

O Workbench precisa coordenar pessoas e agentes com baixo custo de tokens, sem
criar uma infraestrutura remota antes de provar o fluxo.

## Decisão

JSON, Markdown e JSONL dentro de `apps/<app>/.matriz/**` são a fonte canônica.
Git fornece histórico, portabilidade, revisão e recuperação.

## Consequências

- a V1 funciona offline e sem banco;
- conflitos são explícitos por revision;
- colaboração simultânea e busca semântica ficam para uma fase posterior;
- a UI nunca edita `src/**`.
