import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { asCompanyId } from "../../companies/domain/company"
import { createDemoSeumeiRuntime } from "../../../lib/container"
import { ProductsScreen } from "./ProductsScreen"

async function setup() {
  const userId = asUserId("user-demo-seumei")
  const runtime = createDemoSeumeiRuntime(userId)
  const opened = await runtime.businessOs.openCompany(
    userId,
    asCompanyId("company-galaxia"),
  )
  if (!opened.ok) throw new Error(opened.error)
  return { catalog: runtime.catalog, context: opened.workspace.context }
}

describe("ProductsScreen", () => {
  it("renders the tenant catalog and filters it by search", async () => {
    const props = await setup()
    render(<ProductsScreen {...props} />)

    expect(await screen.findByRole("heading", { name: "Produtos" })).toBeVisible()
    expect(screen.getByText("X-Galáxia")).toBeVisible()
    fireEvent.change(screen.getByRole("searchbox", { name: /buscar produto/i }), {
      target: { value: "milk shake" },
    })

    expect(screen.getByText("Milk Shake Oreo")).toBeVisible()
    expect(screen.queryByText("X-Galáxia")).not.toBeInTheDocument()
  })

  it("persists availability through the catalog service", async () => {
    const props = await setup()
    render(<ProductsScreen {...props} />)

    const toggle = await screen.findByRole("switch", {
      name: /disponibilidade de milk shake oreo/i,
    })
    expect(toggle).toHaveAttribute("aria-checked", "false")
    fireEvent.click(toggle)

    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"))
  })

  it("duplicates a product without navigating away", async () => {
    const props = await setup()
    render(<ProductsScreen {...props} />)

    const duplicate = await screen.findByRole("button", {
      name: /duplicar x-galáxia/i,
    })
    fireEvent.click(duplicate)

    expect(await screen.findByText("X-Galáxia (Cópia)")).toBeVisible()
  })
})
