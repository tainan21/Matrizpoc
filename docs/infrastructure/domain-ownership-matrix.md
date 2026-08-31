# Domain Ownership Matrix

| Domínio | App owner | Schema/estado | Tenancy | Migration authority | Runtime role | Recuperação |
| --- | --- | --- | --- | --- | --- | --- |
| Core | `matriz-identity` | `core` | mixed | `matriz_core_migration` | `matriz_core_runtime` | backup lógico integral |
| Hub | `matriz-hub` | `hub` | tenant | `matriz_hub_migration` | `matriz_hub_runtime` | backup lógico integral |
| Spot | `spot` | `spot` | tenant | `matriz_spot_migration` | `matriz_spot_runtime` | backup lógico integral |
| Seumei | `seumei` | `seumei` | tenant | `matriz_seumei_migration` | `matriz_seumei_runtime` | backup lógico integral |
| Contracts | `contracts` | `contracts` | tenant | `matriz_contracts_migration` | `matriz_contracts_runtime` | backup lógico integral |
| WillDash | `willdash` | `willdash` | tenant | `matriz_willdash_migration` | `matriz_willdash_runtime` | backup lógico integral |
| Ops | `matriz-ops` | `ops` | operator-global | `matriz_ops_migration` | `matriz_ops_runtime` | backup lógico integral |
| Pay | `matriz-pay` | `pay` | global-user | `matriz_pay_migration` | `matriz_pay_runtime` | backup lógico integral |

Admin consome APIs. Control mantém somente estado operacional local. Workbench
e Sites são file-backed. Health, Desktop, Uninstall e MatrizLib não possuem
schema de produto.

Lei: nenhum owner cria tabela, migration, FK ou grant SQL fora do próprio
schema. Runtime não executa migration.

Cada domínio database-backed participante de eventos declara também
`matriz_<schema>_worker`. Pay, Seumei e Hub estão ativos neste gate; as demais
roles permanecem declarativas. Worker não é migration/runtime: possui somente
ACL operacional explícita em `outbox_events`/`inbox_events`, sempre
`NOINHERIT` e `NOBYPASSRLS`.
