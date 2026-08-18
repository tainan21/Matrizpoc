import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import HomePage from "./page"

afterEach(cleanup)

describe("HomePage governance evidence", () => {
  it("presents the three implemented product-language pillars", () => {
    render(<HomePage />)

    const region = screen.getByRole("region", { name: /três pilares/i })
    expect(region).toHaveTextContent("Componentes")
    expect(region).toHaveTextContent("Temas")
    expect(region).toHaveTextContent("Sons")
    expect(screen.getByRole("link", { name: /explorar sons/i })).toHaveAttribute("href", "/sounds")
    expect(region).not.toHaveTextContent("Ícones")
    expect(region).not.toHaveTextContent("MCP")
  })

  it("distinguishes qualified candidates from all audit-qualified entries", () => {
    render(<HomePage />)

    expect(screen.getByText("6")).toBeVisible()
    expect(screen.getByText(/candidatos qualificados/i)).toBeVisible()
  })
})
