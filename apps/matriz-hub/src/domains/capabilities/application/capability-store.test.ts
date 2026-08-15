import { describe, expect, it } from "vitest"
import { createDemoCapabilityStore } from "./capability-store"

describe("demo capability store", () => {
  it("only unlocks a premium theme after the explicit demo checkout", () => {
    const store = createDemoCapabilityStore()
    const actor = { userId: "user_ana", tenantId: "tenant_demo", roles: ["owner"] as const }

    expect(store.listThemes(actor, "matriz-hub")).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "midnight-graphite", priceLabel: "R$ 24 · demo", premium: true, unlocked: false }),
    ]))
    expect(store.canUseTheme(actor, "midnight-graphite")).toBe(false)
    store.purchaseTheme(actor, "midnight-graphite", "user")
    expect(store.canUseTheme(actor, "midnight-graphite")).toBe(true)
    expect(store.listThemes(actor, "matriz-hub")).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "midnight-graphite", premium: true, unlocked: true }),
    ]))
    expect(store.listEvents(actor).at(0)?.name).toBe("theme.purchased")
  })

  it("retains Matriz Base even when no persistence provider is available", () => {
    const store = createDemoCapabilityStore()
    const actor = { userId: "user_ana", tenantId: "tenant_demo", roles: ["member"] as const }

    expect(store.resolveAppearance(actor, "matriz-hub").activeThemeKey).toBe("matriz-base")
    expect(store.resolveAppearance(actor, "matriz-hub").persistence).toBe("demo")
  })

  it("keeps installed Praticies and recents in the actor capability space", () => {
    const store = createDemoCapabilityStore()
    const actor = { userId: "user_ana", tenantId: "tenant_demo", roles: ["member"] as const }
    store.installPracticy(actor, "release-notes")
    store.openPracticy(actor, "release-notes")

    expect(store.getPraticies(actor).installedIds).toContain("release-notes")
    expect(store.getPraticies(actor).recent[0]?.appId).toBe("release-notes")
  })
})
