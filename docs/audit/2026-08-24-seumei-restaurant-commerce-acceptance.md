# Seumei Restaurant Commerce — Acceptance

Data: 2026-08-24  
Branch: `codex/seumei-assimilation`  
Produto: `@matriz/app-seumei`, `appId: seumei`, porta `3008`, web-first

## Resultado

A Seumei agora percorre uma fatia vertical persistente: login Matriz → MyHub com portfólio autorizado → empresa ativa → catálogo/receita/estoque → loja pública → compra simulada → cliente/pedido/timeline → baixa de ingredientes → centro operacional. Nenhum dado empresarial usa `localStorage` como banco e nenhum `tenantId` enviado pelo navegador concede autoridade.

## Decisões arquiteturais

- Core continua dono de usuário, tenant, registro do app e membership; Seumei continua dona de empresa e domínio operacional.
- MyHub consome somente o contrato público V1 de portfólio e recebe BI agregado já tenant-scoped.
- Receita e estoque usam unidades inteiras (`UNIT`, `GRAM`, `MILLILITER`), saldo versionado e movimentos imutáveis.
- Checkout resolve tenant por `storeSlug`, recalcula preço e receita no servidor e executa pedido, cliente e consumos em transação serializável.
- Cliente é identidade comercial tenant-local; não vira `Core User` automaticamente.
- Pagamento é explicitamente simulado. Não há promessa fiscal, financeira, de entrega ou de cobrança real.
- Seumei permanece web-first; nenhum instalador foi criado.

## Route flows validados

1. `/login` → MyHub `/` → `/enter/[companyId]` → `/workspace`.
2. `/workspace/products` → `/workspace/products/[productId]` → `/workspace/products/[productId]/recipe`.
3. `/workspace/ingredients` → `/workspace/stock` → `/workspace/stock/[ingredientId]`.
4. `/store/galaxia-burger` → `/checkout` → `/checkout/success` → `/workspace/orders`.
5. `/workspace/orders/[orderId]` → transições autorizadas; `/workspace/customers/[customerId]` → histórico tenant-local.
6. Conta global vê Galaxia Burger e Sabor & Brasa; operador restrito vê somente Galaxia.

## Dados demo reais

- Galaxia Burger: 4 produtos, 9 ingredientes, 4 receitas, saldos iniciais, publicação e pedido determinístico.
- Sabor & Brasa: 2 produtos, 4 ingredientes, 2 receitas, publicação e imagens autorais próprias.
- Compra executada no navegador: pedido `#0002`, cliente `Marina Browser`, total R$ 29,90.
- Após a compra, a disponibilidade do Galaxia Smash caiu de 99 para 98; MyHub passou a exibir R$ 59,80 e 2 pedidos em operação.
- Provisionamento foi executado duas vezes consecutivas sem duplicar empresas, memberships ou pedido determinístico.

## Segurança e tenancy observadas

- Operador `operacao@galaxiaburger.demo`: 1 empresa no MyHub.
- Acesso direto ao ID conhecido da Sabor & Brasa: HTTP 403 `company_forbidden`.
- Consulta de receita com ID conhecido do tenant B sob contexto Galaxia: HTTP 404 `restaurant_not_found`.
- APIs de checkout rejeitam `tenantId` e autoridade de preço no body.
- Repositories recebem `tenantId` em toda operação privada; checkout público deriva tenant da publicação.
- Constraints compostas impedem relações de receita, pedido, consumo e movimento entre tenants.
- Nenhum cache privado omite contexto; workspace usa `private, no-store` e portfólio é privado.

## Browser real

Playwright headed, Chromium, desktop 1440×1000 e mobile 390×844:

- login global e nova sessão;
- MyHub com 2 empresas e conta restrita com 1;
- entrada na empresa e refresh da receita;
- catálogo com imagens, receita, estoque, loja, checkout e pedido;
- compra persistida e refletida em estoque/BI;
- acesso negado tenant A/B;
- console sem erros de aplicação nos fluxos felizes;
- mobile sem overflow horizontal (`scrollWidth == clientWidth`).

Capturas: `docs/audit/assets/2026-08-24-seumei/`.

## Gates

O fechamento registra os resultados finais consecutivos na seção de evidências do commit final. O banco usado no browser foi um PostgreSQL 17 descartável isolado na porta `55432`, criado sem tocar no serviço PostgreSQL principal da máquina.

## Limites reais

- A sessão atual do ecossistema é mock local; troca de sessão de produção ainda precisa de broker/IdP endurecido.
- O isolamento está completo na aplicação e nas constraints, mas não existe RLS/papel PostgreSQL restrito por tenant.
- Migrações são aditivas e validadas em schema descartável; deploy em ambiente real não foi executado.
- Observabilidade tenant-safe ainda não possui correlação/métricas de produção para checkout e conflitos.
- Publicação avançada com draft/preview, pagamento, fiscal, entrega, merge de clientes e financeiro ficam fora desta fatia.

## Próxima fatia

Financeiro essencial app-local: recebimentos derivados de pedidos e lançamentos manuais em centavos, com origem, competência, vencimento, pagamento e idempotência. Fiscal/contabilidade formal continuam fora.
