import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DashboardView } from "./DashboardView"
import { unavailableDashboard } from "../application/fallback-dashboard"

describe("DashboardView", () => {
  it("renders a useful unavailable state without a broken screen", () => {
    render(<DashboardView dashboard={unavailableDashboard("tenant-laudate", "Laudate")} section="overview" />)
    expect(screen.getByRole("heading", { name: "Visão geral" })).toBeInTheDocument()
    expect(screen.getByText("Informações indisponíveis")).toBeInTheDocument()
    expect(screen.getAllByText("Sem dados").length).toBeGreaterThan(0)
  })
})
