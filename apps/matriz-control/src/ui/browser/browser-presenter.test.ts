import { describe, expect, it } from "vitest"
import { toCapsuleViewModel, type CapsulePayload } from "./browser-presenter"

describe("browser presenter", () => {
  it("makes agent authority and isolation explicit without relying on color", () => {
    const capsule: CapsulePayload = { id: "capsule_1", name: "Testes", policy: "agent-safe", cacheMode: "persistent" }

    expect(toCapsuleViewModel(capsule, { tabs: 8, cacheMiB: 89, selected: true })).toEqual({
      id: "capsule_1",
      name: "Testes",
      selected: true,
      status: "AGENT-SAFE · ISOLADA · 8 ABAS",
      cache: "CACHE 89 MB · PERSISTENTE",
      tone: "warning",
    })
  })
})
