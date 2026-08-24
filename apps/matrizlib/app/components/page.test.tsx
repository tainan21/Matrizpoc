import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import ComponentsPage from "./page"

afterEach(cleanup)

describe("ComponentsPage", () => {
  it("presents the audited catalog summary and explorer", () => {
    render(<ComponentsPage />)

    expect(screen.getByRole("heading", { level: 1, name: "Componentes" })).toBeVisible()
    expect(screen.getByText("99", { selector: "strong" })).toBeVisible()
    expect(screen.getByRole("region", { name: "Explorar catálogo" })).toBeVisible()
  })
})
