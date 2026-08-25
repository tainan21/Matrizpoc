import { asCompanyId } from "../domains/companies/domain/company"
import {
  asProductCategoryId,
  asProductId,
  asProductModifierId,
  type Product,
  type ProductCategory,
  type ProductModifier,
} from "../domains/catalog/domain/catalog"

const galaxiaId = asCompanyId("company-galaxia")
const matrizId = asCompanyId("company-matriz-labs")
const fixtureDate = "2026-08-24T12:00:00.000Z"

export const FIXTURE_PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  { id: asProductCategoryId("category-galaxia-burgers"), companyId: galaxiaId, name: "Burgers", slug: "burgers", sortOrder: 1 },
  { id: asProductCategoryId("category-galaxia-combos"), companyId: galaxiaId, name: "Combos", slug: "combos", sortOrder: 2 },
  { id: asProductCategoryId("category-galaxia-drinks"), companyId: galaxiaId, name: "Bebidas", slug: "bebidas", sortOrder: 3 },
  { id: asProductCategoryId("category-galaxia-desserts"), companyId: galaxiaId, name: "Sobremesas", slug: "sobremesas", sortOrder: 4 },
  { id: asProductCategoryId("category-matriz-software"), companyId: matrizId, name: "Software", slug: "software", sortOrder: 1 },
  { id: asProductCategoryId("category-matriz-services"), companyId: matrizId, name: "Serviços", slug: "servicos", sortOrder: 2 },
]

export const FIXTURE_PRODUCT_MODIFIERS: readonly ProductModifier[] = [
  { id: asProductModifierId("modifier-batata-suprema"), companyId: galaxiaId, name: "Batata Suprema", priceDeltaCents: 1290, available: true },
  { id: asProductModifierId("modifier-onion-rings"), companyId: galaxiaId, name: "Onion Rings", priceDeltaCents: 1190, available: true },
  { id: asProductModifierId("modifier-refrigerante"), companyId: galaxiaId, name: "Refrigerante Lata", priceDeltaCents: 690, available: true },
  { id: asProductModifierId("modifier-milk-shake"), companyId: galaxiaId, name: "Milk Shake Oreo", priceDeltaCents: 1090, available: false },
]

export const FIXTURE_PRODUCTS: readonly Product[] = [
  {
    id: asProductId("product-x-galaxia"), companyId: galaxiaId,
    categoryId: asProductCategoryId("category-galaxia-burgers"), name: "X-Galáxia",
    description: "Pão brioche, 180g, cheddar duplo, bacon e molho especial.", priceCents: 3490,
    imageUrl: "/seumei/fixtures/galaxia-cover.png", stockQuantity: 23, available: true, featured: true,
    modifierIds: [asProductModifierId("modifier-batata-suprema"), asProductModifierId("modifier-onion-rings"), asProductModifierId("modifier-refrigerante")],
    createdAt: fixtureDate, updatedAt: fixtureDate,
  },
  {
    id: asProductId("product-galaxia-bacon"), companyId: galaxiaId,
    categoryId: asProductCategoryId("category-galaxia-burgers"), name: "Galáxia Bacon",
    description: "Pão brioche, 180g, queijo, bacon crocante e molho especial.", priceCents: 3690,
    imageUrl: "/seumei/fixtures/galaxia-cover.png", stockQuantity: 8, available: true, featured: true,
    modifierIds: [asProductModifierId("modifier-batata-suprema"), asProductModifierId("modifier-onion-rings")],
    createdAt: fixtureDate, updatedAt: fixtureDate,
  },
  {
    id: asProductId("product-combo-galactico"), companyId: galaxiaId,
    categoryId: asProductCategoryId("category-galaxia-combos"), name: "Combo Galáctico",
    description: "X-Galáxia, Batata Suprema e Refrigerante 350ml.", priceCents: 4990,
    imageUrl: "/seumei/fixtures/galaxia-cover.png", stockQuantity: 15, available: true, featured: true,
    modifierIds: [asProductModifierId("modifier-refrigerante"), asProductModifierId("modifier-milk-shake")],
    createdAt: fixtureDate, updatedAt: fixtureDate,
  },
  {
    id: asProductId("product-milk-shake-oreo"), companyId: galaxiaId,
    categoryId: asProductCategoryId("category-galaxia-drinks"), name: "Milk Shake Oreo",
    description: "Milk shake de baunilha com Oreo e chantilly.", priceCents: 1890,
    imageUrl: "/seumei/fixtures/galaxia-cover.png", stockQuantity: 0, available: false, featured: false,
    modifierIds: [], createdAt: fixtureDate, updatedAt: fixtureDate,
  },
  {
    id: asProductId("product-coca-cola-lata"), companyId: galaxiaId,
    categoryId: asProductCategoryId("category-galaxia-drinks"), name: "Coca-Cola Lata",
    description: "Refrigerante Coca-Cola 350ml.", priceCents: 690,
    imageUrl: "/seumei/fixtures/galaxia-cover.png", stockQuantity: 42, available: true, featured: false,
    modifierIds: [], createdAt: fixtureDate, updatedAt: fixtureDate,
  },
  {
    id: asProductId("product-brownie-sorvete"), companyId: galaxiaId,
    categoryId: asProductCategoryId("category-galaxia-desserts"), name: "Brownie com Sorvete",
    description: "Brownie quente com sorvete e calda de chocolate.", priceCents: 2290,
    imageUrl: "/seumei/fixtures/galaxia-cover.png", stockQuantity: 5, available: true, featured: true,
    modifierIds: [], createdAt: fixtureDate, updatedAt: fixtureDate,
  },
  {
    id: asProductId("product-sundae-galaxia"), companyId: galaxiaId,
    categoryId: asProductCategoryId("category-galaxia-desserts"), name: "Sundae Galáxia",
    description: "Sorvete de baunilha com calda e confeitos.", priceCents: 1690,
    imageUrl: "/seumei/fixtures/galaxia-cover.png", stockQuantity: 18, available: true, featured: false,
    modifierIds: [], createdAt: fixtureDate, updatedAt: fixtureDate,
  },
  {
    id: asProductId("product-matriz-orbit"), companyId: matrizId,
    categoryId: asProductCategoryId("category-matriz-software"), name: "Orbit Workspace",
    description: "Workspace operacional para equipes em crescimento.", priceCents: 14990,
    imageUrl: "/seumei/fixtures/matriz-labs-cover.png", stockQuantity: 50, available: true, featured: true,
    modifierIds: [], createdAt: fixtureDate, updatedAt: fixtureDate,
  },
  {
    id: asProductId("product-matriz-care"), companyId: matrizId,
    categoryId: asProductCategoryId("category-matriz-services"), name: "Matriz Care",
    description: "Pacote mensal de suporte e evolução assistida.", priceCents: 39900,
    imageUrl: "/seumei/fixtures/matriz-labs-cover.png", stockQuantity: 12, available: true, featured: false,
    modifierIds: [], createdAt: fixtureDate, updatedAt: fixtureDate,
  },
]
