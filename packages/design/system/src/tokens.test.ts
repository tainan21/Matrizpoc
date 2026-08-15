import { describe, expect, it } from "vitest"
import packageJson from "../package.json"
import {
  DESIGN_SYSTEM_VERSION,
  appThemes,
  darkAppThemes,
  semanticTokenNames,
  themeDefinitionToCssVars,
  themeRegistry,
} from "./index"

describe("MatrizLib token contract", () => {
  it("publishes the same stable version from package and code", () => {
    expect(packageJson.version).toBe("0.1.0")
    expect(DESIGN_SYSTEM_VERSION).toBe("0.1.0")
  })

  it("namespaces every public semantic variable", () => {
    expect(semanticTokenNames.length).toBeGreaterThan(0)
    for (const name of semanticTokenNames) expect(name).toMatch(/^--matriz-/)
  })

  it("resolves every required semantic role for every light and dark app theme", () => {
    for (const appId of Object.keys(appThemes) as Array<keyof typeof appThemes>) {
      expect(darkAppThemes[appId]).toBeDefined()
      for (const mode of ["light", "dark"] as const) {
        const css = themeDefinitionToCssVars("matriz-base", appId, mode)
        for (const name of semanticTokenNames) expect(css[name]).toBeTruthy()
      }
    }
  })

  it("falls back unknown registry keys to Matriz Base", () => {
    const fallback = themeDefinitionToCssVars("not-registered", "matriz-hub", "light")
    const base = themeDefinitionToCssVars("matriz-base", "matriz-hub", "light")

    expect(fallback["--matriz-theme-key"]).toBe("matriz-base")
    for (const name of semanticTokenNames) expect(fallback[name]).toBe(base[name])
  })

  it("keeps commercial fields out of visual theme definitions", () => {
    for (const theme of themeRegistry) {
      expect(theme).not.toHaveProperty("priceLabel")
      expect(theme).not.toHaveProperty("premium")
    }
  })
})
