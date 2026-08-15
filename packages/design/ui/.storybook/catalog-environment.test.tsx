import { act, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { describe, expect, it } from "vitest"

import {
  CatalogGlobalsEnvironment,
  publishCatalogGlobals,
} from "./catalog-environment"

describe("Storybook catalog globals", () => {
  it("updates theme, density, and motion attributes together", () => {
    publishCatalogGlobals({
      theme: "light",
      density: "comfortable",
      motion: "full",
    })

    render(
      <CatalogGlobalsEnvironment>
        <span>Conceptual documentation</span>
      </CatalogGlobalsEnvironment>,
    )

    const root = screen.getByText("Conceptual documentation").parentElement
    expect(root).toHaveAttribute("data-theme", "light")
    expect(root).toHaveAttribute("data-density", "comfortable")
    expect(root).toHaveAttribute("data-motion", "full")

    act(() => {
      publishCatalogGlobals({
        theme: "dark",
        density: "compact",
        motion: "reduced",
      })
    })

    expect(root).toHaveAttribute("data-theme", "dark")
    expect(root).toHaveAttribute("data-density", "compact")
    expect(root).toHaveAttribute("data-motion", "reduced")
  })
})
