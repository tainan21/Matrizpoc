import { describe, expect, it } from "vitest"
import { mapLegacyBrowserState } from "./legacy-import"

describe("legacy browser import", () => {
  it("maps only valid capsules and HTTP(S) tabs without keeping legacy identifiers", () => {
    let sequence = 0
    const result = mapLegacyBrowserState(
      [{ id: "old-human", name: "Pessoal", policy: "human" }, { id: "old-agent", name: "Agente", policy: "agent-safe" }],
      [{ id: "old-tab", capsuleId: "old-agent", title: "Docs", url: "https://example.test", active: true }, { id: "bad", capsuleId: "old-human", title: "Local", url: "file:///secret", active: true }],
      () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
    )
    expect(result.capsules).toHaveLength(2)
    expect(result.tabs).toHaveLength(2)
    expect(result.tabs.some(({ url }) => url.startsWith("file:"))).toBe(false)
    expect(result.capsules.some(({ id }) => id === "old-agent")).toBe(false)
    expect(result.tabs.filter(({ active }) => active)).toHaveLength(1)
  })

  it("rejects empty or unbounded legacy data", () => {
    expect(() => mapLegacyBrowserState([], [], crypto.randomUUID)).toThrow("Nenhuma cápsula válida")
    expect(() => mapLegacyBrowserState(Array.from({ length: 101 }, (_, id) => ({ id: String(id), name: "x", policy: "human" })), [], crypto.randomUUID)).toThrow("excede o limite")
  })
})
