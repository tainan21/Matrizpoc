import { describe, expect, it } from "vitest"
import { CONTROL_THEME_STORAGE_KEY, parseControlTheme, readStoredControlTheme, serializeControlTheme, storeControlTheme } from "./control-theme"

describe("Control theme preference", () => {
  it("uses Matriz as the safe fallback for missing or invalid storage", () => {
    expect(parseControlTheme(null)).toBe("matriz")
    expect(parseControlTheme("unknown")).toBe("matriz")
    expect(parseControlTheme("{bad json")).toBe("matriz")
  })

  it("round-trips only known versioned theme values", () => {
    const serialized = serializeControlTheme("aurora-liquid")
    expect(CONTROL_THEME_STORAGE_KEY).toContain("v1")
    expect(parseControlTheme(serialized)).toBe("aurora-liquid")
    expect(parseControlTheme(JSON.stringify({ version: 2, theme: "aurora-liquid" }))).toBe("matriz")
  })

  it("persists only the compact versioned preference in browser storage", () => {
    const values = new Map<string, string>()
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) }
    storeControlTheme(storage, "industrial-ember")
    expect(readStoredControlTheme(storage)).toBe("industrial-ember")
    expect(values.get(CONTROL_THEME_STORAGE_KEY)).toBe(serializeControlTheme("industrial-ember"))
  })

  it("falls back safely when browser storage is blocked", () => {
    const storage = { getItem: () => { throw new Error("storage blocked") } }
    expect(readStoredControlTheme(storage)).toBe("matriz")
  })
})
