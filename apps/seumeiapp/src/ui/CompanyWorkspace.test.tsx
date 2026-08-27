import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { CompanyWorkspace } from "./CompanyWorkspace"

describe("CompanyWorkspace", () => {
  afterEach(cleanup)
  it("shows the real company context and persisted operational summary", () => {
    render(<CompanyWorkspace workspace={{ companyName: "Oficina Aurora", companySlug: "oficina-aurora", operationLabel: "Operação híbrida", locationLabel: "Recife · BR" }} operations={{ ordersToday: 3, pending: 2, averageCents: 2990, lowStock: 1 }} />)
    expect(screen.getByRole("heading", { name: "Oficina Aurora" })).toBeInTheDocument()
    expect(screen.getByText("Operação híbrida")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Trocar empresa" })).toBeNull()
    expect(screen.getByText("Pedidos hoje")).toBeInTheDocument()
    expect(screen.getByText("Estoque baixo")).toBeInTheDocument()
  })
})
