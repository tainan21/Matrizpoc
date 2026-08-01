---
{"schemaVersion":1,"id":"doc_f37484a0-1b18-4e5f-a7fd-e23a1f3d05a3","projectId":"matriz-infra-hub","kind":"decision","slug":"seumei-conflicting-decisions","title":"Seumei — registro inicial de decisões conflitantes","tags":["seumei","decisions","risk"],"createdAt":"2026-07-30T15:00:00.000Z","updatedAt":"2026-07-30T15:00:00.000Z","revision":"seumei-conflicts-v1"}
---
# Status

Registro de divergências encontradas na documentação. Não resolve decisões da
Seumei; torna o conflito visível para a futura revisão.

## Conflitos observados

1. `doc/legacy/SEUMEI-ARCHITECTURE-v1.0-Legacy.md` proíbe Prisma e descreve
   outra estratégia de tenancy, enquanto a implementação atual possui schema e
   migrations Prisma. O documento permanece histórico.
2. `docs/world.md` afirma que toda regra vive em `domains`, enquanto relatórios
   e documentos de fluxo referenciam lógica em `src/lib/server/**`, rotas e
   outros pontos. A conformidade deve ser medida no código.
3. Documentos de implementação usam simultaneamente “concluído”, “aguardando
   migration”, “erros conhecidos” e “não utilizado”. Status textual não será
   tratado como evidência operacional.
4. Existem pastas `module` e `modules`, além de referências a templates,
   features e onboarding com responsabilidades sobrepostas.
5. A documentação alterna entre workspace, company, enterprise e tenant sem
   uma decisão única de agregado e ownership.

## Decisão desta fase

- `C:\Apps\seumei` é fonte funcional de referência read-only.
- `C:\Apps\newseumei` é arquivo histórico.
- nada é copiado para o Hub;
- o catálogo aponta para a origem;
- cada migração futura exige ADR, teste de paridade e prova de isolamento;
- conflitos não resolvidos bloqueiam a pontuação da capacidade correspondente.

