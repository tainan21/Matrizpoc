import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { SeumeiDesktopSnapshot } from "../../src/ui/presenters/desktop.presenter"
import { SeumeiDesktopApp } from "./app"

afterEach(cleanup)

const snapshot: SeumeiDesktopSnapshot = {
  metrics: { establishments: 2, active: 2, offerings: 2 },
  establishments: [{ id: "one", name: "Bar da Matriz", type: "bar", address: "Rua 1", city: "São Paulo", ownerName: "Joana", serviceRadiusDisplay: "15 km", statusLabel: "Ativo", statusTone: "success" }],
  owners: [{ id: "owner", ownerName: "Joana", email: "joana@example.com", phoneDisplay: "—", bio: "Produtora", establishmentName: "Bar da Matriz", establishmentLocation: "São Paulo" }],
}

describe("Seumei Desktop", () => {
  it("keeps the local runtime explicit and navigates without a web router", () => {
    render(<SeumeiDesktopApp snapshot={snapshot} play={vi.fn()} />)
    expect(screen.getAllByText("LOCAL")).toHaveLength(2)
    expect(screen.getByText("Bar da Matriz")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Proprietários" }))
    expect(screen.getByText("joana@example.com")).toBeVisible()
  })
})
