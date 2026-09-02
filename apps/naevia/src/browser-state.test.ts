import { describe, expect, it } from "vitest"
import { activateCapsule, closeTab } from "./browser-state"
import type { BrowserSnapshot } from "./shared"

const snapshot: BrowserSnapshot = {
  capsules: [
    { id: "capsule-a", name: "Pessoal", policy: "human" },
    { id: "capsule-b", name: "Agente", policy: "agent-safe" },
  ],
  tabs: [
    { id: "tab-a", capsuleId: "capsule-a", title: "A", url: "https://a.test", active: true, loading: false },
    { id: "tab-b", capsuleId: "capsule-b", title: "B", url: "https://b.test", active: false, loading: false },
  ],
  activeCapsuleId: "capsule-a",
  activeTabId: "tab-a",
}

describe("browser state", () => {
  it("activates an existing capsule and exactly one of its tabs", () => {
    const changed = activateCapsule(snapshot, "capsule-b")
    expect(changed.activeCapsuleId).toBe("capsule-b")
    expect(changed.activeTabId).toBe("tab-b")
    expect(changed.tabs.filter((tab) => tab.active).map((tab) => tab.id)).toEqual(["tab-b"])
    expect(snapshot.activeCapsuleId).toBe("capsule-a")
  })

  it("rejects an unknown or empty capsule", () => {
    expect(() => activateCapsule(snapshot, "missing")).toThrow("Cápsula desconhecida")
  })

  it("closes a tab and activates the remaining tab in the same capsule", () => {
    const withTwo: BrowserSnapshot = { ...snapshot, tabs: [...snapshot.tabs, { id: "tab-a2", capsuleId: "capsule-a", title: "A2", url: "https://a2.test", active: false, loading: false }] }
    const changed = closeTab(withTwo, "tab-a")
    expect(changed.activeTabId).toBe("tab-a2")
    expect(changed.tabs.find(({ id }) => id === "tab-a2")?.active).toBe(true)
    expect(() => closeTab(snapshot, "tab-a")).toThrow("A última aba da cápsula não pode ser fechada")
  })
})
