import { describe, expect, it } from "vitest"
import { presentDashboard } from "./dashboard-presenter"
import { unavailableDashboard } from "../application/fallback-dashboard"

describe("Client Admin dashboard presenter", () => {
  it("does not turn unavailable values into zero", () => {
    const view = presentDashboard(unavailableDashboard("tenant-laudate", "Laudate"))
    expect(view.metrics).toEqual([])
    expect(view.statusLabel).toBe("Informações indisponíveis")
    expect(view.sections.systems.valueLabel).toBe("Sem dados")
  })

  it("keeps stale data visibly old", () => {
    const dashboard = unavailableDashboard("tenant-laudate", "Laudate")
    const view = presentDashboard({ ...dashboard, sections: { ...dashboard.sections, systems: { ...dashboard.sections.systems, state: "stale", asOf: "2026-08-30T12:00:00.000Z", lastSuccessAt: "2026-08-30T12:00:00.000Z", data: [{ id: "system-1" }] } } })
    expect(view.sections.systems.stateLabel).toBe("Dados antigos")
    expect(view.sections.systems.valueLabel).toBe("1")
  })
})
