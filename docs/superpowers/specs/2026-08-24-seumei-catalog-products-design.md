# Seumei Catalog / Products Design

**Status:** aprovado pelo escopo mestre da Seumei e pela autorização contínua do usuário
**Data:** 2026-08-24
**Escopo:** `apps/seumei` somente

## Objetivo

Entregar o primeiro domínio operacional após a fundação multiempresa: um catálogo de produtos isolado por tenant, com fonte única para Products Admin e para os futuros slices Store, Orders e Dashboard.

## Abordagem escolhida

Catalog permanece app-local em `apps/seumei/src/domains/catalog`. O domínio possui entidades e regras próprias; a aplicação expõe um serviço que aceita apenas `SeumeiTenantContext` resolvido; a infraestrutura oferece um repositório que valida a membership e devolve uma interface já vinculada ao tenant.

Alternativas rejeitadas:

- arrays globais em React ou Zustand: permitem vazamento entre empresas e tornam Store/Dashboard dependentes de estado de página;
- repositório genérico multi-tenant: dilui ownership e aumenta a chance de consultas sem filtro;
- package compartilhado de produtos: Product pertence à Seumei e ainda não possui uso estável por outro app.

## Modelo de domínio

### ProductCategory

- `id: ProductCategoryId`
- `companyId: CompanyId`
- `name: string`
- `slug: string`
- `sortOrder: number`

### ProductModifier

- `id: ProductModifierId`
- `companyId: CompanyId`
- `name: string`
- `priceDeltaCents: number`
- `available: boolean`

### Product

- `id: ProductId`
- `companyId: CompanyId`
- `categoryId: ProductCategoryId`
- `name: string`
- `description: string`
- `priceCents: number`
- `imageUrl: string`
- `stockQuantity: number`
- `available: boolean`
- `featured: boolean`
- `modifierIds: readonly ProductModifierId[]`
- `createdAt: string`
- `updatedAt: string`

Valores monetários usam centavos inteiros. Preço negativo, quantidade inválida e modificadores de outro tenant são rejeitados no domínio/aplicação.

## Contratos

```ts
interface CatalogRepository {
  bind(context: SeumeiTenantContext): Promise<TenantCatalogRepository | null>
}

interface TenantCatalogRepository {
  listProducts(): Promise<readonly Product[]>
  listCategories(): Promise<readonly ProductCategory[]>
  listModifiers(): Promise<readonly ProductModifier[]>
  findProduct(productId: ProductId): Promise<Product | null>
  saveProduct(product: Product): Promise<Product | null>
  duplicateProduct(productId: ProductId): Promise<Product | null>
}
```

`bind` valida `userId`, `membershipId`, `companyId` e status da membership. Depois do vínculo, nenhuma operação recebe `companyId` arbitrário.

```ts
interface CatalogService {
  getProducts(context: SeumeiTenantContext): Promise<CatalogViewModelResult>
  saveProduct(context: SeumeiTenantContext, input: SaveProductInput): Promise<CatalogMutationResult>
  setProductAvailability(context: SeumeiTenantContext, productId: ProductId, available: boolean): Promise<CatalogMutationResult>
  setProductFeatured(context: SeumeiTenantContext, productId: ProductId, featured: boolean): Promise<CatalogMutationResult>
  duplicateProduct(context: SeumeiTenantContext, productId: ProductId): Promise<CatalogMutationResult>
}
```

O serviço exige `products.view` para leitura. Nesta fase, owners/admins com `products.view` podem mutar; a permissão fina `products.manage` entra agora no tipo de membership e nas fixtures para que as policies não dependam de comparações de role dentro da UI.

## Pricing

```ts
calculateOrderItemPrice({
  product,
  selectedModifiers,
  quantity,
}): {
  baseCents: number
  modifiersCents: number
  subtotalCents: number
  totalCents: number
}
```

Regras:

- quantidade deve ser inteira e maior que zero;
- produto e modificadores devem pertencer à mesma empresa;
- produto/modificador indisponível não pode ser precificado para compra;
- totais são calculados em centavos e nunca no React.

## Fixtures

Galáxia Burger contém sete produtos coerentes com as referências: X-Galáxia, Galáxia Bacon, Combo Galáctico, Milk Shake Oreo, Coca-Cola Lata, Brownie com Sorvete e Sundae Galáxia. Matriz Labs contém dois produtos próprios e nenhuma entidade da Galáxia.

As imagens são configuração da fixture. A arquitetura não contém condicionais para Galáxia Burger.

## Products Admin

### Direção visual

- **Tese visual:** uma bancada operacional noturna, compacta e precisa, com superfícies azul‑preto, linhas discretas e roxo reservado à ação e ao estado ativo.
- **Plano de conteúdo:** título e ação primária; cinco sinais operacionais; categorias e filtros; tabela densa como superfície dominante; editor contextual somente quando solicitado.
- **Tese de interação:** entrada curta e escalonada dos sinais/tabela; toggles com transição determinística; editor com presença rápida, foco inicial e retorno de foco, sempre respeitando `prefers-reduced-motion`.

`ProductsScreen` substitui a tela genérica quando `appId === "products"`.

Capacidades funcionais:

- métricas derivadas da lista: total, ativos, estoque baixo, sem estoque e destaques;
- tabs de categoria e busca local por nome/descrição;
- tabela densa com produto, categoria, preço, estoque, status, destaque, modificadores e ações;
- toggle de disponibilidade e destaque persistidos no repositório da sessão;
- modal acessível de criar/editar com primitives MatrizLib (`Button`, `Input`, `FormField`);
- duplicação funcional com novo ID e sufixo “Cópia”;
- feedback de erro e loading sem optimistic mutation insegura.

Table, modal e switch permanecem em Catalog porque têm semântica e comportamento específicos desta feature. Não serão extraídos para MatrizLib neste ciclo.

## Navegação

`AppShell` passa a usar `AppDefinition.navigation` para construir a sidebar contextual. Products contribui “Produtos” e “Categorias”; aplicações sem contribuição continuam com a navegação mínima existente.

## Isolamento e erros

- contexto inválido ou membership desabilitada: repositório não vincula;
- ausência de `products.view`: leitura negada;
- ausência de `products.manage`: mutação negada;
- ID de outro tenant: retorna `product-not-found`, sem revelar existência;
- entrada inválida: retorna `validation-error` com mensagem apresentável;
- toda mutação refaz o view model a partir do repositório vinculado.

## Testes obrigatórios

- Galáxia Burger não lê produtos da Matriz Labs;
- Galáxia Burger não altera nem duplica produto da Matriz Labs;
- Matriz Labs não lê produtos da Galáxia Burger;
- membership inválida não vincula repositório;
- membro sem `products.manage` não muta;
- disponibilidade e destaque persistem dentro do tenant correto;
- criação/edição valida preço, estoque e categoria do tenant;
- pricing calcula base, modificadores, quantidade e rejeita cross-tenant;
- presenter deriva métricas, filtros e formatação BRL sem expor entidades brutas;
- tela dispara mutações pelo serviço e atualiza a tabela.

## Fora de escopo

- persistência SQL;
- upload de imagens;
- inventário avançado;
- publicação de Store;
- carrinho e criação de Order;
- marketplace ou theme builder.

## Definition of Done

- domínio Catalog app-local e sem dependências circulares;
- nenhuma operação tenant-owned sem `SeumeiTenantContext`;
- Products Admin funcional em Galáxia Burger e Matriz Labs;
- isolamento provado em testes automatizados;
- pricing fora da UI;
- fidelidade visual alta à referência de Produtos;
- testes, typecheck, lint, smoke global e inspeção responsiva aprovados.
