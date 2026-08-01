---
{"schemaVersion":1,"id":"doc_20a6c4e3-d9ef-49ec-b44e-64b4c296df29","projectId":"matriz-infra-hub","kind":"technical","slug":"seumei-bounded-context-map","title":"Seumei — mapa preliminar de bounded contexts","tags":["seumei","ddd","bounded-contexts"],"createdAt":"2026-07-30T15:00:00.000Z","updatedAt":"2026-07-30T15:00:00.000Z","revision":"seumei-bctx-v1"}
---
# Leitura correta

Este é um mapa preliminar derivado das pastas e documentos existentes. Ele não
declara que cada pasta seja um bounded context válido. A futura Seumei deve
confirmar limites por linguagem, invariantes, ownership de dados e casos de uso.

## Contextos candidatos

| Grupo | Pastas/capacidades observadas | Pergunta de fronteira |
| --- | --- | --- |
| identidade e acesso | `user`, `rbac`, auth, whitelist | sessão, identidade e permissão têm modelos separados? |
| tenancy e organização | `workspace`, `company`, `enterprise` | qual entidade é o tenant e onde o isolamento é imposto? |
| onboarding e composição | `onboarding`, `template`, `module`, `modules`, `features` | onboarding é domínio ou processo de aplicação? |
| comércio | `store`, `product`, `checkout`, `order`, `stock` | catálogo, pedido e estoque têm ciclos independentes? |
| financeiro | `finance` e referências de billing | ledger, cobrança e caixa estão separados? |
| experiência configurável | `theme`, `layout-builder`, `component`, `page` | o que é configuração de produto e o que é UI compartilhável? |
| trabalho | `projects`, `task-generation` | pertence ao core Seumei ou a um produto satélite? |
| plataforma | `audit`, `events`, `shared` | são capacidades transversais ou depósitos de acoplamento? |

## Arquitetura-alvo por fatia

Cada capacidade aprovada será portada verticalmente:

`domain → application → ports → adapters → presenters → interface → tests`

Não haverá reorganização em massa. Uma fatia só avança quando tiver:

1. invariantes explícitas;
2. tenant resolvido e obrigatório;
3. portas independentes de framework;
4. adapter de persistência testado;
5. presenter/ViewModel para a interface;
6. testes de paridade com o comportamento atual;
7. teste negativo de vazamento entre tenants.

