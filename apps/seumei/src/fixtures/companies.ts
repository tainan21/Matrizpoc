import { asCompanyId, type Company } from "../domains/companies/domain/company"

export const FIXTURE_COMPANIES: readonly Company[] = [
  {
    id: asCompanyId("company-galaxia"),
    slug: "galaxia-burger",
    legalName: "Galáxia Burger Comércio de Alimentos Ltda.",
    segment: "Alimentação",
    status: "active",
    contactEmail: "contato@galaxiaburger.demo",
    branding: {
      displayName: "Galáxia Burger",
      shortName: "Galáxia",
      logoUrl: "/seumei/fixtures/galaxia-logo.svg",
      coverUrl: "/seumei/fixtures/galaxia-cover.png",
      accent: "#8b5cf6",
    },
  },
  {
    id: asCompanyId("company-matriz-labs"),
    slug: "matriz-labs",
    legalName: "Matriz Labs Tecnologia Ltda.",
    segment: "Tecnologia",
    status: "active",
    contactEmail: "labs@matriz.demo",
    branding: {
      displayName: "Matriz Labs",
      shortName: "Labs",
      logoUrl: "/seumei/fixtures/matriz-labs-logo.svg",
      coverUrl: "/seumei/fixtures/matriz-labs-cover.png",
      accent: "#7c3aed",
    },
  },
]
