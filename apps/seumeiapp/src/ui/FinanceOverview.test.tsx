import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FinanceOverview } from "./FinanceOverview"

describe("FinanceOverview", () => {
  it("renders honest metrics, manual entry fields and immutable order receipts", () => {
    render(<FinanceOverview month="2026-08" view={{
      metrics: [{ label: "Caixa realizado", value: "R$ 75,00", tone: "positive" }],
      overdueLabel: "0 lançamentos vencidos",
      entries: [{ id: "entry_1", numberLabel: "#0001", title: "Pedido #1", description: null, kind: "INCOME", kindLabel: "Entrada", originLabel: "Pedido", statusLabel: "Pago", statusTone: "paid", categoryLabel: "Vendas", amount: "R$ 75,00", competenceLabel: "24/08/2026", dueLabel: "24/08/2026", paidLabel: "24/08/2026 12:00", version: 1, canManage: false, events: [] }],
    }} />)
    expect(screen.getByRole("heading", { name: "Financeiro" })).toBeInTheDocument()
    expect(screen.getByLabelText("Valor")).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.tagName === "SMALL" && element.textContent === "Pedido · Vendas")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument()
  })
})
