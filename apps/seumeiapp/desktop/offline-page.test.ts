import { describe, expect, it } from "vitest"
import { createOfflinePage } from "./offline-page"

describe("createOfflinePage", () => {
  it("renders an explicit unavailable state without application content", () => {
    const page = createOfflinePage("A configuração do desktop não está disponível.")

    expect(page).toContain("Seumei indisponível")
    expect(page).toContain("A configuração do desktop não está disponível.")
    expect(page).toContain("Nenhuma alteração foi enviada.")
    expect(page).not.toContain("Workspace")
  })
})
