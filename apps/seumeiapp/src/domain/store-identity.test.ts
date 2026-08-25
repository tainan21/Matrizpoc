import { describe, expect, it } from "vitest"
import { STORE_IDENTITY_PRESETS, InvalidStoreIdentityError, contrastRatio, validateStoreIdentityDraft } from "./store-identity"

describe("store identity", () => {
  it("offers three stable semantic presets with accessible foreground contrast", () => {
    expect(STORE_IDENTITY_PRESETS.map(({ id }) => id)).toEqual(["COSMIC_DINER", "BRAZILIAN_WARMTH", "MARKET_FRESH"])
    for (const preset of STORE_IDENTITY_PRESETS) {
      expect(Object.keys(preset.tokens).sort()).toEqual(["accent", "accentForeground", "background", "border", "foreground", "muted", "radius", "surface"].sort())
      expect(contrastRatio(preset.tokens.background, preset.tokens.foreground)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(preset.tokens.accent, preset.tokens.accentForeground)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("normalizes a valid draft without accepting executable asset URLs", () => {
    expect(validateStoreIdentityDraft({ preset: "COSMIC_DINER", headline: "  Hambúrgueres de outro mundo  ", announcement: "  Retirada em 20 minutos ", description: "  Smashes preparados com receitas e estoque conectados. ", heroImageUrl: "/demo/galaxia-smash.webp" })).toEqual({
      preset: "COSMIC_DINER", headline: "Hambúrgueres de outro mundo", announcement: "Retirada em 20 minutos", description: "Smashes preparados com receitas e estoque conectados.", heroImageUrl: "/demo/galaxia-smash.webp",
    })
    expect(() => validateStoreIdentityDraft({ preset: "COSMIC_DINER", headline: "Uma loja real", announcement: "", description: "Descrição suficientemente longa.", heroImageUrl: "javascript:alert(1)" })).toThrow(InvalidStoreIdentityError)
  })

  it.each([
    { preset: "UNKNOWN", headline: "Uma loja real", announcement: "", description: "Descrição suficientemente longa.", heroImageUrl: null },
    { preset: "MARKET_FRESH", headline: "x", announcement: "", description: "Descrição suficientemente longa.", heroImageUrl: null },
    { preset: "MARKET_FRESH", headline: "Uma loja real", announcement: "x".repeat(61), description: "Descrição suficientemente longa.", heroImageUrl: null },
  ])("rejects an invalid draft %#", (draft) => {
    expect(() => validateStoreIdentityDraft(draft as never)).toThrow(InvalidStoreIdentityError)
  })
})
