import { describe, expect, it } from "vitest"
import { presentPulse } from "./pulse-presenter"

describe("Pulse presenter", () => {
  it("summarizes operational sources without leaking process details", () => {
    const view = presentPulse({
      projects: [{ id: "control", name: "control" }, { id: "health", name: "health" }],
      sessions: [{ projectId: "control", status: "running" }, { projectId: "health", status: "failed" }],
      git: { available: true, dirty: true },
      doctor: { available: true, status: "warning" },
    })
    expect(view.sessions).toEqual({ running: 1, attention: 1, total: 2 })
    expect(view.projects).toEqual({ known: 2, active: 1 })
    expect(view.git).toMatchObject({ label: "Mudanças pendentes", tone: "warning" })
    expect(view.doctor).toMatchObject({ label: "Atenção necessária", tone: "warning" })
    expect(JSON.stringify(view)).not.toContain("pid")
  })
})
