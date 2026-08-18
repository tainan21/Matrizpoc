import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import HomePage from "./page"

afterEach(cleanup)

describe("HomePage governance evidence", () => {
  it("distinguishes qualified candidates from all audit-qualified entries", () => {
    render(<HomePage />)

    expect(screen.getByText("6")).toBeVisible()
    expect(screen.getByText(/candidatos qualificados/i)).toBeVisible()
  })
})
