import { describe, expect, it } from "vitest"
import { presentPorts } from "./ports-presenter"

describe("Ports presenter", () => {
  it("distinguishes no port, free, Control session and external occupancy", () => {
    const view = presentPorts({
      projects: [{ id: "control", name: "control", port: 3009 }, { id: "health", name: "health", port: 3010 }, { id: "docs", name: "docs", port: null }, { id: "web", name: "web", port: 3008 }],
      sessions: [{ projectId: "control", port: 3009, status: "running" }],
      availability: new Map([[3010, true], [3008, false]]),
    })
    expect(view.map((item) => [item.projectId, item.state])).toEqual([["control", "control-session"], ["health", "free"], ["docs", "undeclared"], ["web", "external"]])
  })
})
