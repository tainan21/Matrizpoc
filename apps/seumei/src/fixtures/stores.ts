import { asCompanyId } from "../domains/companies/domain/company"
import { asStoreId, type Store } from "../domains/store/domain/store"

export const FIXTURE_STORES: readonly Store[] = [
  {
    id: asStoreId("store-galaxia"),
    companyId: asCompanyId("company-galaxia"),
    slug: "galaxia-burger",
    status: "published",
    configuration: {
      orderingEnabled: true,
      deliveryFeeCents: 590,
      minimumOrderCents: 2000,
      estimatedDeliveryMinutes: [30, 45],
      openingLabel: "Aberto agora · 10:00–23:00",
    },
    appearance: {
      preset: "cosmic-food",
      displayName: "Galáxia Burger",
      logoUrl: "/seumei/fixtures/galaxia-logo.svg",
      heroImageUrl: "/seumei/fixtures/galaxia-cover.png",
      headline: "Os melhores burgers da galáxia!",
      description: "Ingredientes selecionados, sabor único e entrega rápida.",
      accent: "#8b5cf6",
    },
  },
  {
    id: asStoreId("store-matriz-labs"),
    companyId: asCompanyId("company-matriz-labs"),
    slug: "matriz-labs",
    status: "draft",
    configuration: {
      orderingEnabled: false,
      deliveryFeeCents: 0,
      minimumOrderCents: 0,
      estimatedDeliveryMinutes: [0, 0],
      openingLabel: "Catálogo em preparação",
    },
    appearance: {
      preset: "minimal",
      displayName: "Matriz Labs",
      logoUrl: "/seumei/fixtures/matriz-labs-logo.svg",
      heroImageUrl: "/seumei/fixtures/matriz-labs-cover.png",
      headline: "Ferramentas para construir o próximo sistema.",
      description: "Produtos e serviços digitais da Matriz Labs.",
      accent: "#7c3aed",
    },
  },
]

