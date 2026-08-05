import { describe, expect, it } from "vitest"
import {
  DEFAULT_DESIGN_SYSTEM,
  normalizeAppearance,
  normalizeDesignSystem,
  normalizeTheme,
  WORKBENCH_DESIGN_SYSTEM_IDS,
} from "./theme"
import { getAppearanceVariables, WORKBENCH_THEME_PRESETS } from "./theme-presets"

function luminance(hex: string): number {
  const channels = hex.slice(1, 7).match(/.{2}/g)!.map((value) => Number.parseInt(value, 16) / 255).map((value) => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
}

function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

describe("normalizeTheme", () => {
  it("accepts only explicit light and dark preferences", () => {
    expect(normalizeTheme("light")).toBe("light")
    expect(normalizeTheme("dark")).toBe("dark")
    expect(normalizeTheme("system")).toBeUndefined()
    expect(normalizeTheme(undefined)).toBeUndefined()
  })
})

describe("workbench appearance", () => {
  it("accepts the ten registered systems and rejects unknown values", () => {
    expect(WORKBENCH_DESIGN_SYSTEM_IDS).toHaveLength(10)
    for (const system of WORKBENCH_DESIGN_SYSTEM_IDS) expect(normalizeDesignSystem(system)).toBe(system)
    expect(normalizeDesignSystem("tokyo-night")).toBeUndefined()
  })

  it("provides ten unique two-letter labels in the registered order", () => {
    const shortLabels = WORKBENCH_THEME_PRESETS.map((preset) => preset.shortLabel)
    expect(shortLabels).toEqual(["DF", "NB", "MG", "PL", "AU", "ZN", "PU", "TR", "DR", "GL"])
    expect(new Set(shortLabels).size).toBe(10)
    expect(shortLabels.every((label) => label?.length === 2)).toBe(true)
  })

  it("uses a safe dark midnight fallback while preserving a valid mode", () => {
    expect(normalizeAppearance(undefined, undefined)).toEqual({ mode: "dark", system: DEFAULT_DESIGN_SYSTEM })
    expect(normalizeAppearance("light", "invalid")).toEqual({ mode: "light", system: DEFAULT_DESIGN_SYSTEM })
  })

  it("keeps token parity across every preset", () => {
    const expected = Object.keys(getAppearanceVariables("dark", DEFAULT_DESIGN_SYSTEM)).sort()
    for (const preset of WORKBENCH_THEME_PRESETS) {
      expect(Object.keys(getAppearanceVariables("dark", preset.id)).sort()).toEqual(expected)
    }
  })

  it("publishes the generic color contract from every dark preset", () => {
    for (const preset of WORKBENCH_THEME_PRESETS) {
      const variables = getAppearanceVariables("dark", preset.id) as Record<string, string>
      expect(variables["--surface-fg"], preset.id).toBe(preset.tokens.text)
      expect(variables["--color-foreground"], preset.id).toBe(preset.tokens.text)
      expect(variables["--color-surface"], preset.id).toBe(preset.tokens.surface1)
      expect(variables["--color-background"], preset.id).toBe(preset.tokens.canvas)
      expect(variables["--color-border"], preset.id).toBe(preset.tokens.border)
      expect(variables["--accent-fg"], preset.id).toBe(preset.tokens.accentText)
    }
  })

  it("uses the same light palette regardless of the stored dark system", () => {
    expect(getAppearanceVariables("light", "aurora")).toEqual(getAppearanceVariables("light", "pulse"))
  })

  it("keeps readable text and visible focus in every dark system", () => {
    for (const preset of WORKBENCH_THEME_PRESETS) {
      expect(contrast(preset.tokens.text, preset.tokens.surface1), preset.id).toBeGreaterThanOrEqual(4.5)
      expect(contrast(preset.tokens.focus, preset.tokens.surface1), preset.id).toBeGreaterThanOrEqual(3)
      expect(contrast(preset.tokens.accentText, preset.tokens.accent), preset.id).toBeGreaterThanOrEqual(4.5)
    }
  })
})
