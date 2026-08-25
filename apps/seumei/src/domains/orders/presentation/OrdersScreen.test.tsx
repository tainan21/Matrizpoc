import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { asCompanyId } from "../../companies/domain/company"
import { createDemoSeumeiRuntime } from "../../../lib/container"
import { OrdersScreen } from "./OrdersScreen"

afterEach(cleanup)

async function setup() {
  const userId = asUserId("user-demo-seumei")
  const runtime = createDemoSeumeiRuntime(userId)
  const opened = await runtime.businessOs.openCompany(userId, asCompanyId("company-galaxia"))
  if (!opened.ok) throw new Error(opened.error)
  return { orders: runtime.ordersOperations, context: opened.workspace.context }
}

describe("OrdersScreen", () => {
  it("renders tenant orders and filters by operational status", async () => {
    render(<OrdersScreen {...await setup()} />)
    expect(await screen.findByRole("heading", { name: "Pedidos" })).toBeVisible()
    expect(screen.getByText("Lucas Ferreira")).toBeVisible()
    fireEvent.change(screen.getByRole("combobox", { name: "Status do pedido" }), { target: { value: "ready" } })
    expect(screen.getByText("Juliana Lima")).toBeVisible()
    expect(screen.queryByText("Lucas Ferreira")).not.toBeInTheDocument()
  })

  it("advances a placed order and refreshes its operational state", async () => {
    render(<OrdersScreen {...await setup()} />)
    const action = await screen.findByRole("button", { name: "Iniciar preparo do pedido #1254" })
    fireEvent.click(action)
    await waitFor(() => expect(screen.getAllByText("Em preparo").length).toBeGreaterThan(1))
  })
})
