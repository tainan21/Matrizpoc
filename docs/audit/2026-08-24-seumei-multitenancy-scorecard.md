# Seumei — Multi-tenancy scorecard

Data: 2026-08-24

## Placar

- **Escopo atual da aplicação: 96/100.** Faltam telemetria operacional completa e uma prova de concorrência em PostgreSQL automatizada no CI.
- **Prontidão de produção integral: 84/100.** Faltam 16 pontos: RLS/papéis restritos (8), sessão/SSO de produção (4), observabilidade tenant-safe (2) e ensaio operacional de migrations/backup/restore (2).

| Controle | Peso | Estado | Evidência |
| --- | ---: | --- | --- |
| Ownership explícito em Core/Seumei | 8 | PASS | `core.prisma`, `seumei.prisma`, leis arquiteturais |
| Tenant resolvido server-side | 8 | PASS | `active-company.ts`, store slug resolver, testes negativos |
| Membership além da existência do tenant | 8 | PASS | Core app-scoped membership e capabilities |
| Repository privado sempre tenant-scoped | 8 | PASS | interfaces e selectors compostos |
| Browser não concede tenant/preço/receita | 7 | PASS | handlers rejeitam campos de autoridade |
| IDs conhecidos tenant A/B | 7 | PASS | 403 na empresa B; 404 na receita B |
| Constraints/índices compostos | 7 | PASS | migration de receitas/estoque/comércio |
| Checkout atômico e serializável | 8 | PASS | pedido/cliente/consumos na mesma transação |
| Idempotência | 6 | PASS | provisionamento e checkout determinísticos |
| Saldo nunca negativo | 5 | PASS | check + update condicional + regra de domínio |
| Cache seguro | 4 | PASS | private/no-store no workspace; público varia por slug/versão |
| Dados e erros sem fallback falso | 5 | PASS | configuração ausente gera indisponibilidade explícita |
| Sessão/SSO de produção | 4 | PARTIAL | broker atual é mock local validado pelo Hub |
| RLS/papel DB tenant-restrito | 8 | FAIL | isolamento depende da aplicação/constraints |
| Observabilidade sem vazamento | 3 | PARTIAL | erros estáveis; faltam métricas/correlação de produção |
| Migrations, backup e restore operacional | 4 | PARTIAL | SQL aditivo validado; ambiente real não tocado |
| Jobs/webhooks/cache distribuído | 2 | N/A seguro | não existem nesta fatia; reavaliar ao introduzir integrações |

## Interpretação

O produto está multi-tenant por construção dentro da fatia implementada: modelo, contexto, repositories, APIs, autorização e testes negativos concordam. “100% produção” seria uma afirmação incorreta enquanto a defesa em profundidade do banco, a sessão real e a operação de migrations/observabilidade não existirem.
