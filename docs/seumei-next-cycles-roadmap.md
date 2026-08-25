# Seumei - roadmap dos próximos ciclos

Data: 2026-08-24

## Estado após o ciclo financeiro essencial

- **Concluído:** ingredientes, receitas, estoque/movimentos, publicação demo, compra simulada, pedidos, clientes e financeiro essencial.
- **Parcial deliberado:** publicação possui contrato e versão persistentes, mas editor de draft/preview avançado permanece no ciclo de identidade visual.
- **Próximo:** identidade visual e publicação versionada. Pagamento real, fiscal, frete, domínio e analytics continuam fora até integração justificada.

Este roadmap organiza as próximas capacidades como fatias verticais independentes. Nenhuma rota deve nascer como página vazia: cada ciclo termina com UI, regra, autorização, persistência, estados honestos, navegação, isolamento tenant A/B e validação em browser real.

## Sequência e dependências

| Ciclo | Resultado de usuário | Route flow principal | Dependências | Prioridade |
| --- | --- | --- | --- | --- |
| 1. Estoque e movimentos | Operar saldo auditável por ingrediente/receita | `/workspace/products/[productId]/recipe` -> `/workspace/stock` -> `/workspace/stock/[ingredientId]` | Catálogo assimilado | **Concluído** |
| 2. Loja e publicação | Publicar catálogo demo resolvido por slug | `/store/[storeSlug]` -> `/store/[storeSlug]/checkout` | Catálogo e receitas | **Concluído para demo; editor P2** |
| 3. Pedidos | Criar/receber e acompanhar pedidos com estados válidos | `/workspace/orders` -> `/workspace/orders/[orderId]` | Estoque; loja para canal público | **Concluído para compra simulada** |
| 4. Clientes | Consolidar contatos e histórico comercial por empresa | `/workspace/customers` -> `/workspace/customers/[customerId]` | Pedidos para evidência de identidade | **Concluído no escopo e-mail/telefone** |
| 5. Financeiro essencial | Enxergar recebimentos, despesas e resultado operacional básico | `/workspace/finance` -> `/workspace/finance/entries/[entryId]` | Pedidos; decisão de escopo financeiro | **Concluído no escopo operacional** |
| 6. Identidade visual/publicação | Personalizar e revisar a experiência pública com acessibilidade | `/workspace/store/design` -> `/workspace/store/preview` -> `/loja/[slug]` | Loja/publicação estável | P2 |
| 7. Integrações justificadas | Conectar somente serviços necessários a fluxos reais | `/workspace/settings/integrations` -> provedor -> retorno | Contrato estável do domínio consumidor | P2/P3 |

## Ciclo 1 - Estoque e movimentos

Contrato aprovado: saldo materializado por variante, movimentos imutáveis, atualização atômica e idempotente, OWNER/ADMIN escrevem e todos os membros leem. Fora de escopo: reservas de pedido, depósitos, lotes, custo e importação.

Critério de saída: entrada, saída e reconciliação persistem; saídas concorrentes não geram saldo negativo; tenant A não lê variante ou histórico de B; refresh e nova sessão preservam o estado; browser desktop/mobile e gates consecutivos ficam verdes.

Plano executável: `docs/superpowers/plans/2026-08-22-seumei-stock-movements.md`.

## Ciclo 2 - Loja e publicação

Criar `Store` app-local ligada a uma empresa, com rascunho versionado e uma publicação explícita. A rota pública resolve slug publicado server-side e expõe apenas catálogo público. Mudanças posteriores permanecem em draft até nova publicação.

Não inclui editor visual completo, domínio customizado, pagamento ou frete. Testes cobrem slug concorrente, draft invisível ao público, despublicação, catálogo tenant-scoped e cache com chave de publicação/tenant.

## Ciclo 3 - Pedidos

Definir uma máquina de estados pequena e explícita antes da UI. O pedido preserva snapshot de itens/preços, canal de origem e idempotência. A integração com estoque usa um contrato deliberado de reserva/baixa; não modifica movimentos manualmente por conveniência.

Começar por criação manual ou loja pública conforme a decisão de produto. Testes cobrem transições inválidas, repetição de comando, autorização, totais em centavos, efeitos atômicos e IDs conhecidos entre tenants.

## Ciclo 4 - Clientes

Modelar cliente comercial como dado da empresa, nunca como `Core User` automático. Consolidar contatos, consentimento mínimo e histórico de pedidos. Definir chave de duplicidade e merge antes de importar dados.

Testes cobrem e-mail/telefone normalizados, duplicidade, merge auditável, privacidade por papel e isolamento tenant A/B.

## Ciclo 5 - Financeiro essencial

Entregar somente o mínimo operacional validado: lançamentos monetários em centavos, origem explícita, competência/vencimento/pagamento e visão de caixa. Distinguir eventos derivados de pedido de ajustes manuais e impedir dupla contabilização com idempotência.

Fiscal, contabilidade formal, conciliação bancária e emissão de documento ficam fora até existir requisito e integração autorizada.

## Ciclo 6 - Identidade visual e publicação

Adicionar presets e tokens limitados sobre a loja estável, consumindo MatrizLib apenas em superfícies públicas neutras. Preview e publicado são versões distintas; o editor deve manter contraste, foco, responsividade e recuperação de configuração inválida.

Não criar um construtor livre de páginas inicialmente. Blocos adicionais dependem de dois ou mais casos reais e contrato estável.

## Ciclo 7 - Integrações futuras justificadas

Cada integração nasce do domínio consumidor e de um route flow concreto. Credenciais ficam server-side; callbacks validam assinatura, tenant e idempotência; indisponibilidade degrada honestamente sem inventar sucesso.

Ordem recomendada quando os fluxos exigirem: e-mail transacional, pagamentos, frete, domínio/publicação e analytics consentido. Um adapter app-local precede qualquer extração compartilhada.

## Gates comuns de cada ciclo

- Testes de comportamento, autorização e dois tenants com IDs conhecidos.
- Migration aditiva em PostgreSQL descartável e estratégia para dados existentes.
- `test`, `lint`, `typecheck`, `build`, smoke e Prisma; gates globais quando contrato/schema/manifest forem tocados.
- Browser desktop/mobile: fluxo feliz, vazio, loading, indisponível, conflito, erro, refresh, nova sessão, teclado, foco, console e overflow.
- Ledger, decisões e guia do próximo agente atualizados no estado commitado.
- Sem segredo, cache, output de build, mock de persistência ou página futura vazia.

## Dez decisões para os ciclos futuros

Estas perguntas não bloqueiam Estoque. A recomendação entre parênteses reduz o espaço de decisão quando o ciclo correspondente começar.

1. A loja pública começa em `/loja/[slug]`, subdomínio ou domínio customizado? (Recomendado: `/loja/[slug]`, com domínio customizado em fase posterior.)
2. Quem pode publicar/despublicar: OWNER, ADMIN ou ambos; precisa dupla aprovação? (Recomendado: OWNER e ADMIN, sem dupla aprovação inicialmente, sempre auditado.)
3. O pedido reserva estoque na criação ou somente após confirmação de pagamento? (Recomendado: reserva com expiração quando o canal público/pagamento existir.)
4. Quais estados iniciais e regras de cancelamento/reembolso são obrigatórios? (Recomendado: `DRAFT`, `PENDING`, `CONFIRMED`, `FULFILLED`, `CANCELLED`; reembolso em fatia própria.)
5. Qual canal cria pedidos primeiro: manual no workspace, loja pública ou ambos? (Recomendado: manual primeiro para estabilizar domínio; público em seguida.)
6. A unicidade de cliente por empresa usa e-mail, telefone ou composição; como funciona merge? (Recomendado: nenhum identificador universal isolado; sugestões de duplicidade e merge auditado.)
7. “Financeiro essencial” significa caixa, contas a receber/pagar, despesas ou somente visão derivada de pedidos? (Recomendado: caixa simples mais recebíveis/despesas; sem contabilidade formal.)
8. Documento fiscal, imposto e escrituração estão explicitamente fora ou entram no primeiro financeiro? (Recomendado: fora até requisito jurídico e provedor definidos.)
9. A identidade visual usa presets Matriz ou um construtor livre de layout? (Recomendado: presets/tokens limitados e acessíveis, sem page builder.)
10. Qual integração vem primeiro e há sandbox/credenciais: e-mail, pagamentos, frete, domínio ou analytics? (Recomendado: e-mail transacional; depois pagamentos e frete conforme o canal público.)
