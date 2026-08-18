import { describe, expect, it } from "vitest"

import { GATES, MATRIZ_DESKTOP_APPS, QUICK_TARGETS } from "./catalog"

describe("desktop operational catalog", () => {
  it("maps every Matriz web app to one unique development port", () => {
    expect(MATRIZ_DESKTOP_APPS.map(({ port }) => port)).toEqual([
      3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007,
    ])
    expect(new Set(MATRIZ_DESKTOP_APPS.map(({ packageName }) => packageName)).size).toBe(8)
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
})
