import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import packageJson from "../package.json"
import {
  DESIGN_SYSTEM_VERSION,
  appThemes,
  darkAppThemes,
  semanticFeedbackColors,
  semanticTokenNames,
  themeDefinitionToCssVars,
  themeRegistry,
} from "./index"

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )

  if (!channels || channels.length !== 3) throw new Error(`Invalid color: ${hex}`)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(foreground: string, background: string): number {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (left, right) => right - left,
  )
  return (values[0] + 0.05) / (values[1] + 0.05)
}

const tokensCss = readFileSync(new URL("./tokens.css", import.meta.url), "utf8")

function cssValue(source: string, name: string): string {
  const match = source.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"))
  if (!match) throw new Error(`Missing ${name} in tokens.css`)
  return match[1]
}

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

  it("resolves the MatrizLib base theme in both color modes", () => {
    expect(themeDefinitionToCssVars("matriz-base", "matrizlib", "light")["--matriz-theme-key"]).toBe("matriz-base")
    expect(themeDefinitionToCssVars("matriz-base", "matrizlib", "dark")["--matriz-color-text"]).toBeTruthy()
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

  it("keeps normal feedback text at 4.5:1 or better on every theme surface", () => {
    const feedbackTokens = [
      "--matriz-color-success",
      "--matriz-color-warning",
      "--matriz-color-danger",
      "--matriz-color-info",
    ] as const

    for (const appId of Object.keys(appThemes) as Array<keyof typeof appThemes>) {
      for (const mode of ["light", "dark"] as const) {
        const css = themeDefinitionToCssVars("matriz-base", appId, mode)
        for (const token of feedbackTokens) {
          for (const background of ["--matriz-color-canvas", "--matriz-color-surface"] as const) {
            expect(
              contrastRatio(css[token], css[background]),
              `${appId} ${mode} ${token} on ${background}`,
            ).toBeGreaterThanOrEqual(4.5)
          }
        }
      }
    }
  })

  it("keeps the published CSS feedback colors at 4.5:1 or better in light and dark", () => {
    const lightCanvas = cssValue(tokensCss, "--matriz-color-canvas")
    const lightSurface = cssValue(tokensCss, "--matriz-color-surface")
    const darkSection = tokensCss.match(/\[data-matrizlib\]\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)

    if (!darkSection) throw new Error("Missing dark token section in tokens.css")

    const darkCanvas = cssValue(darkSection[1], "--matriz-color-canvas")
    const darkSurface = cssValue(darkSection[1], "--matriz-color-surface")

    for (const tone of Object.keys(semanticFeedbackColors.light) as Array<keyof typeof semanticFeedbackColors.light>) {
      const lightColor = cssValue(tokensCss, `--matriz-primitive-${tone}`)
      const darkColor = cssValue(darkSection[1], `--matriz-color-${tone}`)

      expect(lightColor).toBe(semanticFeedbackColors.light[tone])
      expect(darkColor).toBe(semanticFeedbackColors.dark[tone])
      expect(contrastRatio(lightColor, lightCanvas), `${tone} light on canvas`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(lightColor, lightSurface), `${tone} light on surface`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(darkColor, darkCanvas), `${tone} dark on canvas`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(darkColor, darkSurface), `${tone} dark on surface`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
