# Seumei — relatório final da assimilação

Data: 2026-08-24

Branch: `codex/seumei-assimilation`

Produto: `@matriz/app-seumei`

Identidade pública: `appId: seumei`

Superfície: web-first, porta canônica `3008`

## Resultado executivo

A assimilação planejada foi concluída até o último ciclo autorizado. A nova Seumei é uma aplicação nativa do Matriz-Hub, com dados persistentes e tenant-scoped desde a seleção/criação da empresa até catálogo, receitas, estoque, loja pública, checkout simulado, pedidos, clientes, financeiro e identidade/publicação da loja.

O código da referência não participa do runtime. Seus comportamentos úteis foram investigados e reconstruídos dentro das fronteiras canônicas do monorepo; persistência local, page builder livre, integrações fictícias, duplicações e acoplamentos incompatíveis não foram assimilados.

## Route flow entregue

`/login` → MyHub `/` → criar/selecionar empresa → `/onboarding` → `/workspace` → catálogo/receitas/estoque → loja pública → checkout simulado → pedidos/clientes/financeiro → identidade/preview/publicação.

Também estão funcionais:

1. `/workspace/members` → convite persistente → `/invite/[token]` → membership aceita;
2. `/workspace/products` → produto com imagem/descrição → receita com ingredientes;
3. `/workspace/ingredients` → `/workspace/stock` → movimentos imutáveis;
4. `/store/[storeSlug]` → `/checkout` → `/checkout/success` → pedido e baixa atômica;
5. `/workspace/orders/[orderId]` e `/workspace/customers/[customerId]`;
6. `/workspace/finance` → lançamento manual → pagamento/cancelamento auditável;
7. `/workspace/store/design` → preview privado → publicação/despublicação;
8. `/docs` → laboratório temporário de route flows.

## Capacidades concluídas

| Ciclo | Entrega | Evidência principal |
| --- | --- | --- |
| Fundação | Login, MyHub, empresa, membership inicial, onboarding retomável e workspace | migration `202608200001_company_onboarding`, testes de seleção e isolamento |
| Membros | Papéis, capacidades, convite e aceite seguro | token armazenado como hash, negação por tenant/capacidade |
| Catálogo | Categorias, produtos, variantes e imagens | migration `202608220001_catalog`, view models e APIs autorizadas |
| Estoque | Ingredientes, receitas, saldo versionado e movimentos | migration `202608240001_recipes_stock`, saldo não negativo |
| Loja e pedidos | Publicação, checkout simulado, cliente, pedido e consumo | migration `202608240002_demo_commerce`, transação serializável |
| Financeiro | Recebimentos de pedido e lançamentos manuais auditáveis | migration `202608240003_essential_finance`, centavos inteiros |
| Identidade | Três presets, draft versionado, preview e snapshot publicado | migration `202608240004_store_identity_publication` |
| Integrações | Gate de prontidão, ownership e pré-condições | decisão `2026-08-24-seumei-integration-readiness-design.md` |

## Demos persistentes

- **Galaxia Burger:** direção `COSMIC_DINER`, 4 produtos, 9 ingredientes, 4 receitas, estoque, pedidos, clientes, financeiro e publicação.
- **Sabor & Brasa:** direção `BRAZILIAN_WARMTH`, 2 produtos, 4 ingredientes, 2 receitas, estoque e publicação independente.
- A conta global de demonstração enxerga somente seu portfólio autorizado no MyHub; uma conta operacional limitada enxerga apenas Galaxia Burger.
- O provisionamento foi executado duas vezes sem duplicar empresas, memberships, pedidos determinísticos ou lançamentos derivados.

## Segurança e multi-tenancy

O tenant ativo é resolvido no servidor a partir da sessão, da empresa ativa e da membership. O navegador não concede `tenantId`, preço, receita ou capacidade. Repositories privados exigem escopo, relações importantes usam chaves/índices compostos e os testes negativos exercitam IDs conhecidos entre tenants.

Placar honesto:

- **96/100 no escopo atual da aplicação.** Restam telemetria operacional completa e prova automatizada de concorrência PostgreSQL no CI.
- **84/100 para produção integral.** Restam RLS/papel restrito no banco (8), SSO de produção (4), observabilidade tenant-safe (2) e ensaio operacional de migration/backup/restore (2).

Portanto, a aplicação está multi-tenant por construção no escopo entregue, mas não é correto declarar prontidão de produção 100% enquanto essas defesas operacionais não existirem.

## Validação em browser real

Chromium controlado foi usado em desktop e mobile para login, nova sessão, MyHub, entrada na empresa, refresh, produtos, receita, estoque, checkout, pedidos, clientes, financeiro, preview, publicação, despublicação, acesso negado e tenant A versus tenant B.

Resultados observados:

- compra persistida criou pedido e cliente, reduziu estoque e atualizou o BI;
- draft privado não vazou para a loja antes da publicação;
- despublicação retirou a loja do ar sem apagar histórico e republicação recuperou-a;
- usuário `MEMBER` não recebeu navegação nem acesso direto a áreas administrativas;
- ID conhecido de outra empresa retornou `403 company_forbidden`; recurso interno conhecido retornou `404` no tenant errado;
- viewport mobile de 390 px permaneceu sem overflow horizontal;
- console final permaneceu limpo nos fluxos aceitos.

As capturas estão em `docs/audit/assets/2026-08-24-seumei/`, `docs/audit/assets/2026-08-24-seumei-finance/` e `docs/audit/assets/2026-08-24-seumei-store-identity/`.

## Gates finais

Duas rodadas consecutivas foram aprovadas sobre o mesmo estado funcional (`5c5744c`):

- Seumei: **68 arquivos / 321 testes**;
- lint e typecheck do app aprovados;
- build do app aprovado com **54 rotas**;
- smoke global: **24 arquivos / 158 testes**;
- **seis schemas Prisma** válidos;
- lint global: **37/37 tarefas**;
- typecheck global: **37/37 tarefas**;
- build global: **10/10 tarefas**.

Avisos não bloqueantes: raiz de workspace inferida pelo Next no worktree e API CJS legada do Vite no smoke. Nenhum gate foi relaxado.

## Decisões finais e limites

- A Seumei permanece web-first. Nenhum instalador foi criado porque a missão proíbe uma casca nativa nesta etapa e não existe fluxo de cliente estável que a justifique.
- Pagamento continua explicitamente simulado; não há cobrança, fiscal, frete ou conciliação bancária real.
- E-mail de convite continua oferecendo link manual verdadeiro. Implementação real requer owner Core/mensageria, sandbox, sender verificado e outbox idempotente.
- Upload/CDN, domínio customizado, analytics, fiscal e PSP só devem nascer depois das pré-condições registradas no gate de integrações.
- O broker de sessão local é o mock canônico de desenvolvimento; produção exige IdP/SSO real.
- Nenhuma migration foi aplicada em banco real. Todas são aditivas e foram validadas em PostgreSQL descartável.

## Continuidade recomendada

O próximo ciclo não deve adicionar outra tela vazia. Deve endurecer produção: sessão/SSO, RLS ou papel de banco tenant-restrito, observabilidade com correlação segura, ensaio de migration/backup/restore e concorrência PostgreSQL no CI. Depois disso, a primeira integração de produto recomendada é e-mail transacional de convite; PSP deve aguardar decisão comercial explícita.

## Evidências de continuidade

- `docs/seumei-migration-ledger.md`
- `docs/seumei-next-cycles-roadmap.md`
- `docs/superpowers/specs/2026-08-24-seumei-integration-readiness-design.md`
- `docs/audit/2026-08-24-seumei-multitenancy-scorecard.md`
- `apps/seumeiapp/docs/AGENT-START-HERE.md`
