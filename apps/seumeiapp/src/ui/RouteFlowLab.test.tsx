import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RouteFlowLab } from "./RouteFlowLab"

describe("RouteFlowLab", () => {
  it("renders canonical flows and previews a drawn route", () => {
    render(<RouteFlowLab />)
    expect(screen.getByRole("heading", { name: "Route flows" })).toBeInTheDocument()
    expect(screen.getByText("Entrada na empresa")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Passos da rota"), {
      target: { value: "/login — entrar\n/workspace — operar" },
    })
    expect(screen.getByText("operar")).toBeInTheDocument()
  })
})
