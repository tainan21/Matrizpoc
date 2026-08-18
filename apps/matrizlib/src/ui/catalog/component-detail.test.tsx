import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { componentCatalog } from "../../catalog/component-catalog"
import { toComponentCatalogDetailViewModel } from "../../catalog/presenters"
import { ComponentDetail } from "./component-detail"

afterEach(cleanup)

describe("ComponentDetail", () => {
  it("renders a real public component for an available entry", () => {
    const entry = componentCatalog.find((item) => item.name === "Button")!

    render(<ComponentDetail component={toComponentCatalogDetailViewModel(entry)} />)

    expect(screen.getByRole("region", { name: "Preview ao vivo de Button" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Ação principal" })).toBeEnabled()
    expect(screen.getByText('import { Button } from "@matriz/design-ui"')).toBeVisible()
    expect(screen.getByText("stable")).toBeVisible()
  })

  it("documents candidate anatomy without inventing an import or interactive API", () => {
    const entry = componentCatalog.find((item) => item.name === "TenantSwitcher")!

    render(<ComponentDetail component={toComponentCatalogDetailViewModel(entry)} />)

    expect(screen.getByLabelText("Anatomia planejada de TenantSwitcher")).toBeVisible()
    expect(screen.getByText("Anatomia pretendida")).toBeVisible()
    expect(screen.getByText("Estados previstos")).toBeVisible()
    expect(screen.getByText(/não possui export público/i)).toBeVisible()
    expect(screen.queryByText(/import \{/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("distinguishes a public export that is still missing catalog metadata", () => {
    const entry = componentCatalog.find((item) => item.name === "ThemeToggle")!

    render(<ComponentDetail component={toComponentCatalogDetailViewModel(entry)} />)

    expect(screen.getByText("Export público auditado · metadata pendente")).toBeVisible()
    expect(screen.getByText(/metadata canônico no catálogo/i)).toBeVisible()
    expect(screen.queryByText(/não possui export público/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/import \{/)).not.toBeInTheDocument()
  })

  it("gives the standalone Input preview a persistent visible label", () => {
    const entry = componentCatalog.find((item) => item.name === "Input")!

    render(<ComponentDetail component={toComponentCatalogDetailViewModel(entry)} />)

    const input = screen.getByRole("textbox", { name: "Valor de exemplo" })
    expect(screen.getByText("Valor de exemplo")).toHaveAttribute("for", input.id)
  })

  it("keeps the live Button preview target at least 44 pixels tall", () => {
    const entry = componentCatalog.find((item) => item.name === "Button")!

    render(<ComponentDetail component={toComponentCatalogDetailViewModel(entry)} />)

    expect(screen.getByRole("button", { name: "Ação principal" }).style.minHeight).toBe("2.75rem")
  })

  it("keeps the live Input preview target at least 44 pixels tall", () => {
    const entry = componentCatalog.find((item) => item.name === "Input")!

    render(<ComponentDetail component={toComponentCatalogDetailViewModel(entry)} />)

    expect(screen.getByRole("textbox", { name: "Valor de exemplo" }).style.minHeight).toBe(
      "2.75rem",
    )
  })
})
