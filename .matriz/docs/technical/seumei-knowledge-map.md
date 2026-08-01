---
{"schemaVersion":1,"id":"doc_64c875a7-a21f-4eaf-985b-d20d7a45c068","projectId":"matriz-infra-hub","kind":"technical","slug":"seumei-knowledge-map","title":"Seumei — mapa de conhecimento de referência","tags":["seumei","portfolio-federado","conhecimento"],"createdAt":"2026-07-30T15:00:00.000Z","updatedAt":"2026-07-30T15:00:00.000Z","revision":"seumei-kmap-v1"}
---
# Propósito

Este documento é um índice, não uma cópia. A fonte funcional permanece no
repositório registrado como `seumei-reference`, vinculado localmente em modo
read-only. O caminho absoluto fica apenas em `.matriz/local/**`, ignorado pelo
Git.

## Fotografia verificada

- 81 arquivos Markdown existem no repositório, considerando toda a árvore e
  excluindo dependências, Git e builds.
- 54 documentos entram na allowlist atual do Workbench.
- Classificação do catálogo: 1 canônico, 9 de referência, 38 históricos e 6
  ainda não classificados.
- O repositório possui código, schema Prisma e migrations; presença não
  significa que a capacidade esteja pronta para migração.

## Portas de entrada

| Assunto | Referência na fonte | Uso |
| --- | --- | --- |
| visão arquitetural atual | `docs/world.md` | hipótese arquitetural a confrontar com o código |
| revisão crítica | `ARCHITECTURE_REVIEW_REPORT.md` | riscos e dívida já identificados |
| autenticação | `doc/autenticacao/README.md` | fluxo OTP e pontos de operação |
| onboarding | `doc/FLUXO-ONBOARDING-CENTRALIZADO.md` | comportamento a validar por testes |
| plataforma | `doc/PLATFORM-ARCHITECTURE-V3.md` | referência de evolução |
| dados | `doc/MIGRATION-NOTES.md` e `prisma/**` | inventário, nunca migração direta |
| loja | `docs/IMPLEMENTACAO-MODULO-LOJA-AUDITORIA.md` | claims a verificar contra código e testes |
| histórico | `doc/legacy/**` | contexto histórico, não regra vigente |

## Regra de consumo

Listagens retornam somente metadados. Conteúdo completo entra no contexto apenas
quando um documento é selecionado explicitamente e respeita o orçamento. Antes
de aceitar qualquer afirmação de “concluído”, o agente deve confirmar código,
testes, schema e comportamento observável.

