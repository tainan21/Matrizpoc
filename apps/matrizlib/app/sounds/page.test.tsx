import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import SoundsPage from "./page"

afterEach(cleanup)

describe("SoundsPage", () => {
  it("presents the shared sound system as a technical catalog", () => {
    render(<SoundsPage />)

    expect(screen.getByRole("heading", { level: 1, name: "Sons" })).toBeVisible()
    const summary = screen.getByLabelText("Resumo do catálogo de sons")
    expect(within(summary).getAllByText("12")).toHaveLength(2)
    expect(within(summary).getByText("Pack ativo")).toBeVisible()
    expect(within(summary).getByText("Matriz Default")).toBeVisible()
    expect(screen.getByRole("region", { name: "Explorar sons" })).toBeVisible()
  })
})
