import type { AuthorizedCompanyContext } from "./company-onboarding"
import { createCatalogCategory, createCatalogProduct } from "./catalog-service"
import { createIngredient, createStockMovement, saveProductRecipe } from "./restaurant-service"
import type { CatalogRepository } from "../domain/repositories/catalog-repository"
import type { RestaurantRepository } from "../domain/repositories/restaurant-repository"
import type { IngredientUnit } from "../domain/recipe"
import type { FinanceRepository } from "../domain/repositories/finance-repository"

interface DemoIngredient {
  readonly name: string
  readonly slug: string
  readonly unit: IngredientUnit
  readonly openingBalance: number
  readonly lowStockThreshold: number
}

interface DemoProduct {
  readonly name: string
  readonly slug: string
  readonly description: string
  readonly sku: string
  readonly price: string
  readonly image: string
  readonly imageAlt: string
  readonly recipe: readonly { readonly ingredient: string; readonly quantity: number }[]
}

const GALAXIA_INGREDIENTS: readonly DemoIngredient[] = [
  { name: "Pão brioche", slug: "pao-brioche", unit: "UNIT", openingBalance: 100, lowStockThreshold: 20 },
  { name: "Carne bovina", slug: "carne-bovina", unit: "GRAM", openingBalance: 18_000, lowStockThreshold: 3_000 },
  { name: "Queijo cheddar", slug: "queijo-cheddar", unit: "GRAM", openingBalance: 8_000, lowStockThreshold: 1_200 },
  { name: "Bacon", slug: "bacon", unit: "GRAM", openingBalance: 5_000, lowStockThreshold: 800 },
  { name: "Calabresa", slug: "calabresa", unit: "GRAM", openingBalance: 6_000, lowStockThreshold: 900 },
  { name: "Alface", slug: "alface", unit: "GRAM", openingBalance: 4_000, lowStockThreshold: 600 },
  { name: "Tomate", slug: "tomate", unit: "GRAM", openingBalance: 5_000, lowStockThreshold: 700 },
  { name: "Molho da casa", slug: "molho-da-casa", unit: "MILLILITER", openingBalance: 5_000, lowStockThreshold: 700 },
  { name: "Batata", slug: "batata", unit: "GRAM", openingBalance: 20_000, lowStockThreshold: 3_000 },
] as const

const GALAXIA_PRODUCTS: readonly DemoProduct[] = [
  {
    name: "Galaxia Smash", slug: "galaxia-smash", sku: "GAL-SMASH", price: "29,90",
    description: "Brioche tostado, smash bovino, cheddar, salada fresca e molho da casa.",
    image: "/demo/galaxia-burger/galaxia-smash.webp", imageAlt: "Galaxia Smash servido em fundo escuro",
    recipe: [{ ingredient: "pao-brioche", quantity: 1 }, { ingredient: "carne-bovina", quantity: 180 }, { ingredient: "queijo-cheddar", quantity: 40 }, { ingredient: "alface", quantity: 20 }, { ingredient: "tomate", quantity: 30 }, { ingredient: "molho-da-casa", quantity: 20 }],
  },
  {
    name: "Galaxia Bacon", slug: "galaxia-bacon", sku: "GAL-BACON", price: "34,90",
    description: "Smash bovino, cheddar cremoso, bacon crocante e molho especial.",
    image: "/demo/galaxia-burger/galaxia-bacon.webp", imageAlt: "Galaxia Bacon com bacon crocante",
    recipe: [{ ingredient: "pao-brioche", quantity: 1 }, { ingredient: "carne-bovina", quantity: 180 }, { ingredient: "queijo-cheddar", quantity: 40 }, { ingredient: "bacon", quantity: 50 }, { ingredient: "molho-da-casa", quantity: 20 }],
  },
  {
    name: "Galaxia Calabresa", slug: "galaxia-calabresa", sku: "GAL-CALABRESA", price: "32,90",
    description: "Carne bovina, calabresa dourada, cheddar e salada no brioche.",
    image: "/demo/galaxia-burger/galaxia-calabresa.webp", imageAlt: "Galaxia Calabresa com queijo e salada",
    recipe: [{ ingredient: "pao-brioche", quantity: 1 }, { ingredient: "carne-bovina", quantity: 120 }, { ingredient: "calabresa", quantity: 70 }, { ingredient: "queijo-cheddar", quantity: 30 }, { ingredient: "alface", quantity: 20 }, { ingredient: "tomate", quantity: 30 }],
  },
  {
    name: "Fritas Cósmicas", slug: "fritas-cosmicas", sku: "GAL-FRITAS", price: "14,90",
    description: "Batatas douradas e crocantes com molho da casa.",
    image: "/demo/galaxia-burger/galaxia-fritas.webp", imageAlt: "Porção de fritas cósmicas com molho",
    recipe: [{ ingredient: "batata", quantity: 300 }, { ingredient: "molho-da-casa", quantity: 30 }],
  },
] as const

export const DEMO_RESTAURANTS = {
  "galaxia-burger": {
    category: { name: "Cardápio Galaxia", slug: "cardapio-galaxia", description: "Smashes e acompanhamentos da casa" },
    ingredients: GALAXIA_INGREDIENTS,
    products: GALAXIA_PRODUCTS,
  },
  "sabor-e-brasa": {
    category: { name: "Especialidades da Brasa", slug: "especialidades-da-brasa", description: "Pratos preparados na brasa" },
    ingredients: [
      { name: "Pão artesanal", slug: "pao-artesanal", unit: "UNIT", openingBalance: 60, lowStockThreshold: 12 },
      { name: "Carne de costela", slug: "carne-de-costela", unit: "GRAM", openingBalance: 12_000, lowStockThreshold: 2_000 },
      { name: "Queijo coalho", slug: "queijo-coalho", unit: "GRAM", openingBalance: 5_000, lowStockThreshold: 800 },
      { name: "Vinagrete", slug: "vinagrete", unit: "GRAM", openingBalance: 4_000, lowStockThreshold: 600 },
    ] as readonly DemoIngredient[],
    products: [
      { name: "Costela na Brasa", slug: "costela-na-brasa", sku: "BRASA-COSTELA", price: "39,90", description: "Costela bovina, queijo coalho e vinagrete no pão artesanal.", image: "/demo/sabor-e-brasa/costela-na-brasa.webp", imageAlt: "Sanduíche de costela desfiada e queijo coalho na brasa", recipe: [{ ingredient: "pao-artesanal", quantity: 1 }, { ingredient: "carne-de-costela", quantity: 220 }, { ingredient: "queijo-coalho", quantity: 45 }, { ingredient: "vinagrete", quantity: 40 }] },
      { name: "Queijo da Brasa", slug: "queijo-da-brasa", sku: "BRASA-QUEIJO", price: "24,90", description: "Queijo coalho dourado e vinagrete no pão artesanal.", image: "/demo/sabor-e-brasa/queijo-da-brasa.webp", imageAlt: "Sanduíche vegetariano de queijo coalho dourado e vinagrete", recipe: [{ ingredient: "pao-artesanal", quantity: 1 }, { ingredient: "queijo-coalho", quantity: 100 }, { ingredient: "vinagrete", quantity: 35 }] },
    ] as readonly DemoProduct[],
  },
} as const

export async function provisionDemoRestaurantData(
  context: AuthorizedCompanyContext,
  catalog: CatalogRepository,
  restaurant: RestaurantRepository,
) {
  const definition = DEMO_RESTAURANTS[context.company.slug as keyof typeof DEMO_RESTAURANTS]
  if (!definition) return { products: 0, ingredients: 0 }

  const categories = await catalog.listCategories(context.company.tenantId)
  const category = categories.find(({ slug }) => slug === definition.category.slug)
    ?? await createCatalogCategory(context, definition.category, catalog)

  const knownIngredients = [...await restaurant.listIngredients(context.company.tenantId)]
  for (const item of definition.ingredients) {
    let record = knownIngredients.find(({ slug }) => slug === item.slug)
    if (!record) {
      record = await createIngredient(context, { ...item, sku: `DEMO-${item.slug.toUpperCase()}` }, restaurant)
      knownIngredients.push(record)
    }
    if (record.balance === 0 && item.openingBalance > 0) {
      await createStockMovement(context, record.id, {
        expectedVersion: record.version,
        idempotencyKey: `demo-opening-${context.company.slug}-${item.slug}`,
        type: "ENTRY",
        quantity: item.openingBalance,
        reason: "Saldo inicial da demonstração",
      }, restaurant)
    }
  }

  const knownProducts = [...await catalog.listProducts(context.company.tenantId)]
  for (const item of definition.products) {
    let product = knownProducts.find(({ slug }) => slug === item.slug)
    if (!product) {
      product = await createCatalogProduct(context, {
        name: item.name, slug: item.slug, description: item.description, categoryId: category.id,
        type: "SIMPLE", status: "ACTIVE",
        variants: [{ name: "Padrão", sku: item.sku, price: item.price }],
        images: [{ url: item.image, altText: item.imageAlt }],
      }, catalog)
      knownProducts.push(product)
    }
    if (product.images[0]?.url !== item.image && catalog.replaceProductImages) {
      await catalog.replaceProductImages(context.company.tenantId, product.id, [{ url: item.image, altText: item.imageAlt, position: 0 }])
    }
    const detail = await restaurant.findProductRecipe(context.company.tenantId, product.id)
    if (detail && !detail.recipe) {
      await saveProductRecipe(context, detail.variant.id, null, {
        yieldQuantity: 1,
        lines: item.recipe.map((line) => ({
          ingredientId: knownIngredients.find(({ slug }) => slug === line.ingredient)!.id,
          quantity: line.quantity,
        })),
      }, restaurant)
    }
  }

  return { products: definition.products.length, ingredients: definition.ingredients.length }
}

export async function reconcileDemoOrderReceipts(
  tenantId: string,
  orderIds: readonly string[],
  finance: Pick<FinanceRepository, "reconcileOrderReceipt">,
): Promise<number> {
  let reconciled = 0
  for (const orderId of orderIds) {
    if (await finance.reconcileOrderReceipt(tenantId, orderId)) reconciled += 1
  }
  return reconciled
}
