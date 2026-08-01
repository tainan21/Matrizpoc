---
{"schemaVersion":1,"id":"doc_54142f7d-54f5-420c-9db1-91f55a15b06a","projectId":"matriz-infra-hub","kind":"technical","slug":"seumei-reusable-capabilities","title":"Seumei — catálogo de capacidades reaproveitáveis","tags":["seumei","migration","reuse"],"createdAt":"2026-07-30T15:00:00.000Z","updatedAt":"2026-07-30T15:00:00.000Z","revision":"seumei-reuse-v1"}
---
# Princípio

Reaproveitar comportamento comprovado, não copiar estrutura por conveniência.
Nenhum item abaixo está autorizado para migração automática.

## Classificação inicial

| Capacidade | Classificação inicial | Evidência a produzir antes de portar |
| --- | --- | --- |
| fluxo OTP e resolução de usuário | portar comportamento e reescrever estrutura | testes de login, expiração, replay e falha do provedor |
| onboarding centralizado | portar comportamento e reescrever estrutura | máquina de estados, idempotência e cenários de retomada |
| workspace/company | migrar dados e reescrever aplicação | definição única de tenant, constraints e teste cross-tenant |
| RBAC | portar comportamento e reescrever estrutura | matriz de permissões, deny-by-default e escalada negativa |
| schema e migrations Prisma | manter como referência até ensaio isolado | índices, constraints, rollback e dados reais anonimizados |
| loja, produto, pedido e estoque | avaliar por fatias verticais | paridade de casos de uso e consistência transacional |
| tema e layout configurável | avaliar limites com Matriz Lib UI | separar preferências de produto de componentes genéricos |
| documentos legacy | manter somente como referência | identificar decisão substituta e data de obsolescência |

## Gates obrigatórios

- inventário de tabelas e ownership;
- classificação de dados por tenant;
- testes contra leitura e escrita entre tenants;
- migration rehearsal em banco descartável;
- validação de índices, chaves e constraints;
- plano de rollback executável;
- comparação de comportamento antes/depois;
- adoção por uma fatia pequena antes da seguinte.

