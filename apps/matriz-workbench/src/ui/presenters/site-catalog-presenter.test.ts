import { describe, expect, it } from "vitest"
import type { SiteSummary } from "../../integration/sites/site-catalog-bridge"
import { toSiteCatalogItemViewModel } from "./site-catalog-presenter"

const site: SiteSummary = {
  id: "example",
  name: "Example",
  status: "draft",
  presetId: "editorial",
  defaultLocale: "pt-BR",
  locales: ["pt-BR", "en"],
  metadataCompleteness: {
    completed: 3,
    total: 5,
    missing: ["icons", "openGraphImage"],
  },
}

describe("toSiteCatalogItemViewModel", () => {
  it("turns the safe Sites projection into compact communication copy", () => {
    expect(toSiteCatalogItemViewModel(site)).toMatchObject({
      id: "example",
      statusLabel: "Rascunho",
      shortLabel: "EX",
      completion: 60,
      completionLabel: "3 de 5 itens",
      localeLabel: "2 idiomas",
      missingLabel: "Faltam ícones e imagem social",
    })
  })

  it.each([
    ["active", "Ativo"],
    ["archived", "Arquivado"],
  ] as const)("localizes the %s status", (status, label) => {
    expect(toSiteCatalogItemViewModel({ ...site, status }).statusLabel).toBe(label)
  })
})
