import { describe, expect, it } from "vitest"

import { ACCEPTANCE_CASES } from "./catalog"

const EXPECTED_FAMILIES = [
  "accessibility",
  "actions",
  "apps",
  "command",
  "doctor",
  "installer",
  "lifecycle",
  "native",
  "navigation",
  "ports",
  "settings",
  "terminal",
  "visual",
  "workspace",
] as const

const APP_IDS = [
  "matriz-hub",
  "spot",
  "matriz-admin",
  "contracts",
  "willdash",
  "matriz-workbench",
  "sites",
  "matrizlib",
  "seumei",
] as const

describe("acceptance catalog", () => {
  it("keeps all 98 required acceptance IDs unique", () => {
    const ids = ACCEPTANCE_CASES.map((item) => item.id)

    expect(ids).toHaveLength(98)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ACCEPTANCE_CASES.every((item) => item.required)).toBe(true)
  })

  it("covers every required acceptance family", () => {
    const families = [...new Set(ACCEPTANCE_CASES.map((item) => item.family))].sort()

    expect(families).toEqual(EXPECTED_FAMILIES)
  })

  it("defines start, readiness, stop and restart for all nine Matriz apps", () => {
    const appCases = ACCEPTANCE_CASES.filter((item) => item.family === "apps")

    expect(appCases).toHaveLength(36)
    for (const appId of APP_IDS) {
      expect(appCases.filter((item) => item.appId === appId).map((item) => item.action)).toEqual([
        "start",
        "ready",
        "stop",
        "restart",
      ])
    }
  })

  it("freezes the catalog and every public entry", () => {
    expect(Object.isFrozen(ACCEPTANCE_CASES)).toBe(true)
    expect(ACCEPTANCE_CASES.every(Object.isFrozen)).toBe(true)
  })
})
