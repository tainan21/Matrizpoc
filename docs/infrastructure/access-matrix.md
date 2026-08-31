# Schema, API, Cache e Event Access Matrix

| Origem | Schema próprio | Core SQL | Outros schemas | Identity API | Cache | Eventos |
| --- | --- | --- | --- | --- | --- | --- |
| Identity/Core | RW | próprio | não | owner | namespace `matriz-identity` | pub/sub declarado |
| Hub | RW | não | não | leitura mínima autenticada | `matriz-hub` | pub/sub declarado |
| Spot | RW | não | não | leitura mínima autenticada | `spot` | pub/sub declarado |
| Seumei | RW | não | não | leitura mínima autenticada | `seumei` | pub/sub declarado |
| Contracts | RW | não | não | leitura mínima autenticada | `contracts` | pub/sub declarado |
| WillDash | RW | não | não | leitura mínima autenticada | `willdash` | pub/sub declarado |
| Ops | RW | não | não | operador/grants | `matriz-ops` | subscribe declarado |
| Pay | RW | não | não | usuário/grants | `matriz-pay` | publish declarado |
| Admin | não | não | não | APIs administrativas | próprio se declarado | subscribe declarado |
| Control | não | não | não | não em runtime V1 | estado local | métricas sem payload |

Chaves de cache seguem
`matriz:v1:<appId>:<tenant|global>:<namespace>:<key>`, sempre com TTL. Cache não
é fonte de verdade. Credenciais NATS limitam publish/subscribe aos subjects do
manifest. Toda célula não listada é negada.

Workers ativos de Pay, Seumei e Hub acessam exclusivamente a outbox do próprio
schema. Não recebem `BYPASSRLS`, grants em tabelas de negócio ou autoridade
derivada de `tenantId` no envelope. As demais worker roles estão declaradas e
provisionáveis, mas sua adoção funcional continua pendente.
