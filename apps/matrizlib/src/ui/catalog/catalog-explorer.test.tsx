import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { componentCatalog } from "../../catalog/component-catalog"
import { CatalogExplorer } from "./catalog-explorer"

afterEach(cleanup)

describe("CatalogExplorer", () => {
  it("filters the catalog and announces the result count", async () => {
    const user = userEvent.setup()

    render(<CatalogExplorer entries={componentCatalog} />)
    await user.type(screen.getByRole("searchbox", { name: "Buscar componentes" }), "Button")

    expect(screen.getByRole("status")).toHaveTextContent("1 componente")
    expect(screen.getByRole("link", { name: /Button/ })).toHaveAttribute(
      "href",
      "/components/button",
    )
  })

  it("combines category and stage filters through labelled controls", async () => {
    const user = userEvent.setup()

    render(<CatalogExplorer entries={componentCatalog} />)
    await user.selectOptions(screen.getByRole("combobox", { name: "Categoria" }), "input")
    await user.selectOptions(screen.getByRole("combobox", { name: "Estágio" }), "candidate")

    expect(screen.getByRole("status")).toHaveTextContent("10 componentes")
    expect(screen.getByRole("link", { name: /SearchField/ })).toBeVisible()
    expect(screen.queryByRole("link", { name: /^Button$/ })).not.toBeInTheDocument()
    expect(screen.getAllByText("Candidato").length).toBeGreaterThan(0)
  })

  it("clears all filters and explains an empty result", async () => {
    const user = userEvent.setup()

    render(<CatalogExplorer entries={componentCatalog} />)
    await user.type(screen.getByRole("searchbox", { name: "Buscar componentes" }), "sem-match")

    expect(screen.getByText("Nenhum componente encontrado")).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Limpar filtros" }))

    expect(screen.getByRole("status")).toHaveTextContent("99 componentes")
  })
})
