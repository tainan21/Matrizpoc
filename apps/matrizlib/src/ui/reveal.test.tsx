import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Reveal } from "./reveal"

describe("Reveal", () => {
  it("keeps revealed content available without animation state", () => {
    render(
      <Reveal>
        <p>Canonical visual contracts</p>
      </Reveal>,
    )

    expect(screen.getByText("Canonical visual contracts")).toBeVisible()
  })
})
