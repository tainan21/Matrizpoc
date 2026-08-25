import { describe, expect, it } from "vitest"
import {
  capsuleQuotaState,
  automationCapabilityForTarget,
  canAgentBootstrapCapsule,
  canUseAgentCapability,
  mergeSafeLibrary,
  navigationTarget,
  tabsToSuspend,
  type BrowserTab,
} from "./browser"

describe("browser domain", () => {
  it("turns plain text into the capsule search provider and accepts safe URLs", () => {
    expect(navigationTarget("matriz control browser", { kind: "duckduckgo" })).toBe("https://duckduckgo.com/?q=matriz%20control%20browser")
    expect(navigationTarget("localhost:3008/doctor", { kind: "google" })).toBe("http://localhost:3008/doctor")
    expect(navigationTarget("https://example.com/a", { kind: "google" })).toBe("https://example.com/a")
    expect(() => navigationTarget("javascript:alert(1)", { kind: "duckduckgo" })).toThrow(/unsupported navigation/i)
  })

  it("keeps agent-safe useful while reserving sensitive actions for agent-full", () => {
    expect(canUseAgentCapability("agent-safe", "page.click")).toBe(true)
    expect(canUseAgentCapability("agent-safe", "credentials.write")).toBe(false)
    expect(canUseAgentCapability("agent-safe", "account.delete")).toBe(false)
    expect(canUseAgentCapability("agent-full", "account.delete")).toBe(true)
    expect(canUseAgentCapability("human", "page.read")).toBe(false)
  })

  it("merges only safe library data and deduplicates by semantic identity", () => {
    const merged = mergeSafeLibrary(
      { bookmarks: [{ url: "https://a.test", title: "A" }], notes: [{ id: "n1", text: "first" }], savedTabs: ["https://a.test"] },
      { bookmarks: [{ url: "https://a.test", title: "New title" }, { url: "https://b.test", title: "B" }], notes: [{ id: "n2", text: "second" }], savedTabs: ["https://b.test", "https://a.test"] },
    )

    expect(merged.bookmarks).toEqual([{ url: "https://a.test", title: "A" }, { url: "https://b.test", title: "B" }])
    expect(merged.notes.map((note) => note.id)).toEqual(["n1", "n2"])
    expect(merged.savedTabs).toEqual(["https://a.test", "https://b.test"])
    expect(merged).not.toHaveProperty("cookies")
  })

  it("suspends least-recent background tabs while preserving active and pinned tabs", () => {
    const tab = (id: string, lastActiveAt: string, options: Partial<BrowserTab> = {}): BrowserTab => ({
      id,
      capsuleId: "capsule",
      url: `https://${id}.test`,
      title: id,
      status: "ready",
      pinnedLive: false,
      active: false,
      lastActiveAt,
      ...options,
    })
    const tabs = [
      tab("old", "2026-01-01T00:00:00.000Z"),
      tab("new", "2026-01-03T00:00:00.000Z"),
      tab("active", "2026-01-02T00:00:00.000Z", { active: true }),
      tab("pinned", "2025-01-01T00:00:00.000Z", { pinnedLive: true }),
    ]

    expect(tabsToSuspend(tabs, 3)).toEqual(["old"])
  })

  it("warns at soft quotas without authorizing automatic deletion", () => {
    expect(capsuleQuotaState(900, 1024)).toEqual({ level: "ok", canAutoDelete: false })
    expect(capsuleQuotaState(1024, 1024)).toEqual({ level: "warning", canAutoDelete: false })
  })

  it("requires human approval for full policy and classifies sensitive page targets", () => {
    expect(canAgentBootstrapCapsule("agent", "agent-safe")).toBe(true)
    expect(canAgentBootstrapCapsule("agent", "agent-full")).toBe(false)
    expect(automationCapabilityForTarget("page.type", { inputType: "password", autocomplete: "current-password", intent: "Entrar" })).toBe("credentials.write")
    expect(automationCapabilityForTarget("page.click", { inputType: "button", autocomplete: "", intent: "Excluir conta permanentemente" })).toBe("account.delete")
    expect(automationCapabilityForTarget("page.click", { inputType: "submit", autocomplete: "", intent: "Confirmar compra" })).toBe("purchase.submit")
  })

  it.each([
    ["Confirmar exclusão", "account.delete"],
    ["Place order", "purchase.submit"],
    ["Confirm", "publish.submit"],
    ["Yes", "publish.submit"],
    ["", "publish.submit"],
  ] as const)("blocks ambiguous or high-impact click target %j", (intent, expected) => {
    expect(automationCapabilityForTarget("page.click", { inputType: "", autocomplete: "", intent })).toBe(expected)
  })
})
