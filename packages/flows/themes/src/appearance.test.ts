import { describe, expect, it } from "vitest"
import { getThemeOffer, resolveAppearance, themeOffers } from "./index"

const catalog = [
  { key: "matriz-base", version: 1, compatibleApps: ["matriz-hub", "spot"] },
  { key: "midnight-graphite", version: 2, compatibleApps: ["matriz-hub"] },
] as const

describe("appearance resolution", () => {
  it("owns the commercial theme catalog outside the visual definitions", () => {
    expect(themeOffers).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "matriz-base", priceLabel: "Sempre disponível", premium: false }),
      expect.objectContaining({ key: "midnight-graphite", priceLabel: "R$ 24 · demo", premium: true }),
    ]))
    expect(getThemeOffer("not-registered")).toBeUndefined()
  })

  it("keeps Matriz Base and suggests the organization theme when the user has no choice", () => {
    expect(resolveAppearance({ appId: "matriz-hub", catalog, organizationThemeKey: "midnight-graphite" })).toMatchObject({
      activeThemeKey: "matriz-base",
      source: "base",
      suggestedThemeKey: "midnight-graphite",
    })
  })

  it("keeps an explicit compatible user choice above the organization recommendation", () => {
    expect(resolveAppearance({ appId: "matriz-hub", catalog, userThemeKey: "midnight-graphite", organizationThemeKey: "matriz-base" })).toMatchObject({
      activeThemeKey: "midnight-graphite",
      source: "user",
      suggestedThemeKey: undefined,
    })
  })

  it("falls back safely when a selected theme is not compatible with the app", () => {
    expect(resolveAppearance({ appId: "spot", catalog, userThemeKey: "midnight-graphite" })).toMatchObject({
      activeThemeKey: "matriz-base",
      source: "base",
      fallbackApplied: true,
    })
  })
})
