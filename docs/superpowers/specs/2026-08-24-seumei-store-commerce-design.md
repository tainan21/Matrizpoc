# Seumei Store Commerce — design de domínio

**Status:** aprovado pelo escopo mestre da Seumei e pela autorização contínua do usuário
**Data:** 2026-08-24

## Resultado desta fatia

Entregar o primeiro fluxo público coerente do Seumei:

`slug público → Store publicada → catálogo do tenant → detalhe → preço → carrinho → pedido`

O fluxo usa os mesmos produtos mantidos pelo Products Admin e cria pedidos pertencentes à empresa resolvida pela Store. Nenhum componente público recebe ou autoriza um `companyId` arbitrário.

## Limites

- **Store** possui `Store`, `StoreConfiguration`, `StoreAppearance` e resolve o slug público.
- **Catalog** continua possuindo produtos, categorias, modificadores e a regra de preço do item.
- **Orders** possui pedido e itens. A Store apenas solicita a criação por um contrato de aplicação.
- **Companies** continua possuindo identidade e branding operacional. A apresentação publicada fica em Store.
- Estado de carrinho é temporário e público; dados de catálogo e pedidos passam por repositórios/serviços.

## Resolução e isolamento

1. A rota recebe somente `storeSlug`.
2. `StoreResolver` encontra uma Store publicada e produz um contexto interno imutável com `storeId` e `companyId`.
3. O catálogo público é vinculado a esse contexto interno e só devolve produtos disponíveis do mesmo tenant.
4. Cotação e criação do pedido repetem a resolução, revalidam produto/modificadores e gravam `companyId` derivado da Store.
5. Consultas operacionais de pedidos exigem o `SeumeiTenantContext` autenticado.

## Runtime demo

O runtime demo usa `KeyValueStore` da plataforma, com namespaces independentes para catálogo, carrinho e pedidos. No navegador, os dados vivem em `localStorage`; em testes/SSR, o mesmo contrato usa memória. Assim, uma mutação no Products Admin é observada pela Store sem transformar Zustand/React em banco de domínio.

## Superfícies

- `/loja/[storeSlug]`: home/cardápio publicado, responsiva e independente do shell autenticado.
- `/loja/[storeSlug]/produto/[productId]`: detalhe móvel primeiro, modificadores, quantidade, observação e total calculado fora do React.
- Carrinho contextual persistente por Store com criação de pedido real.
- O app Orders autenticado pode consumir os mesmos pedidos em uma fatia seguinte sem novo mock.

## Visual

Usar as referências aprovadas de Store desktop e mobile, preservando superfícies escuras, acento violeta, densidade e identidade cósmica da Galáxia Burger. Fotografias individuais são fixtures do tenant e não dependências arquiteturais da plataforma.

