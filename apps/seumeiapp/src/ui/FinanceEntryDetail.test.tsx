import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FinanceEntryDetail } from "./FinanceEntryDetail"

describe("FinanceEntryDetail", () => {
  it("exposes controlled transitions and audit history for an open manual entry", () => {
    render(<FinanceEntryDetail entry={{ id: "entry_2", numberLabel: "#0002", title: "Fornecedor", description: "Compra semanal", kind: "EXPENSE", kindLabel: "Saída", originLabel: "Manual", statusLabel: "Em aberto", statusTone: "open", categoryLabel: "Operação", amount: "R$ 120,00", competenceLabel: "24/08/2026", dueLabel: "28/08/2026", paidLabel: null, version: 1, canManage: true, events: [{ id: "event_1", typeLabel: "Em aberto", note: null, createdLabel: "24/08/2026 12:00" }] }} />)
    expect(screen.getByRole("button", { name: "Marcar como pago" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar lançamento" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Histórico do lançamento" })).toBeInTheDocument()
  })
})
