import { describe, expect, it } from "vitest"
import { getThemeDefinition, listCompatibleThemes, themeDefinitionToCssVars } from "./index"

describe("CSS-first theme registry", () => {
  it("exposes Matriz Base for every registered app", () => {
    expect(getThemeDefinition("matriz-base")?.compatibleApps).toContain("willdash")
    expect(getThemeDefinition("matriz-base")?.compatibleApps).toContain("matriz-control")
    const hubBase = themeDefinitionToCssVars("matriz-base", "matriz-hub")
    expect(hubBase["--matriz-theme-key"]).toBe("matriz-base")
    expect(hubBase["--matriz-theme-surface"]).toBe("#0b111b")
    expect(themeDefinitionToCssVars("matriz-base", "matriz-hub", "light")["--matriz-theme-surface"]).toBe("#ffffff")
    expect(themeDefinitionToCssVars("matriz-base", "matriz-control")["--matriz-theme-accent"]).toBe("#9a55ff")
  })

  it("lists only themes compatible with the consuming app", () => {
    expect(listCompatibleThemes("spot").map((theme) => theme.key)).not.toContain("midnight-graphite")
    expect(listCompatibleThemes("matriz-hub").map((theme) => theme.key)).toContain("midnight-graphite")
  })

  it("provides the native Control surface with Matriz themes", () => {
    expect(listCompatibleThemes("matriz-desktop").map((theme) => theme.key)).toEqual([
      "matriz-base",
      "midnight-graphite",
    ])
    expect(
      themeDefinitionToCssVars("matriz-base", "matriz-desktop", "dark")[
        "--matriz-theme-accent"
      ],
    ).toBe("#9a66ff")
  })
})
