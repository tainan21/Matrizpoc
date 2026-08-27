import { describe, expect, it } from "vitest"

import { GATES, MANAGED_OPERATIONS, MATRIZ_DESKTOP_APPS, QUICK_TARGETS } from "./catalog"

describe("desktop operational catalog", () => {
  it("maps every Matriz web app to one unique development port", () => {
    expect(MATRIZ_DESKTOP_APPS.map(({ port }) => port)).toEqual([
      3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008,
    ])
    expect(new Set(MATRIZ_DESKTOP_APPS.map(({ packageName }) => packageName)).size).toBe(9)
  })

  it("offers only fixed root gates and quick targets", () => {
    expect(GATES.map(({ id }) => id)).toEqual([
      "typecheck",
      "lint",
      "test:smoke",
      "prisma:validate",
    ])
    expect(QUICK_TARGETS.map(({ id }) => id)).toEqual([
      "workspace",
      "terminal",
      "hub",
      "matrizlib",
      "workbench",
    ])
    expect([...GATES, ...QUICK_TARGETS].some((entry) => "command" in entry)).toBe(false)
  })

  it("offers only typed managed operation identifiers", () => {
    expect(MANAGED_OPERATIONS.map(({ id }) => id)).toEqual([
      "app.matriz-hub.web",
      "app.spot.web",
      "app.matriz-admin.web",
      "app.contracts.web",
      "app.willdash.web",
      "app.matriz-workbench.web",
      "app.sites.web",
      "app.matrizlib.web",
      "app.seumei.web",
      "app.matriz-admin.native.build",
      "app.matriz-admin.native.install",
      "app.matriz-admin.native.start",
      "gate.typecheck",
      "gate.lint",
      "gate.test:smoke",
      "gate.prisma:validate",
    ])
    expect(MANAGED_OPERATIONS.some((entry) => "command" in entry)).toBe(false)
  })
})
