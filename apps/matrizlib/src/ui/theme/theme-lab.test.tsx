import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { ThemeLab } from "./theme-lab"

afterEach(cleanup)

describe("ThemeLab", () => {
  it("offers only themes registered as compatible with MatrizLib", () => {
    render(<ThemeLab />)

    expect(screen.getByRole("option", { name: "Matriz Base" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Aurora" })).not.toBeInTheDocument()
    expect(screen.getByText(/superfície do próprio MatrizLib/i)).toBeVisible()
  })

  it("keeps mode, density, and viewport changes inside the specimen", async () => {
    const user = userEvent.setup()

    render(<ThemeLab />)
    await user.selectOptions(screen.getByLabelText("Modo"), "dark")
    await user.selectOptions(screen.getByLabelText("Densidade"), "compact")
    await user.selectOptions(screen.getByLabelText("Viewport"), "mobile")

    expect(screen.getByTestId("theme-specimen")).toHaveAttribute("data-mode", "dark")
    expect(screen.getByTestId("theme-specimen")).toHaveAttribute("data-density", "compact")
    expect(screen.getByTestId("theme-viewport")).toHaveAttribute("data-viewport", "mobile")
    expect(document.documentElement).not.toHaveAttribute("data-density")
    expect(document.documentElement).not.toHaveAttribute("data-viewport")
  })
})
