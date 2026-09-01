// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest"

import { describe, expect, it, vi } from "vitest"

import { applyControlTheme, readCachedTheme } from "./control-theme"

describe("Control theme first-frame cache", () => {
  it("reads only the current version and falls back safely", () => {
    expect(readCachedTheme({ getItem: () => JSON.stringify({ version: 1, theme: "industrial-ember" }) })).toBe("industrial-ember")
    expect(readCachedTheme({ getItem: () => JSON.stringify({ version: 2, theme: "aurora-liquid" }) })).toBe("matriz")
    expect(readCachedTheme({ getItem: () => "broken" })).toBe("matriz")
  })

  it("applies the theme before React and writes a versioned cache", () => {
    const storage = { setItem: vi.fn() }
    applyControlTheme("reactor-acid", storage)

    expect(document.documentElement).toHaveAttribute("data-theme", "reactor-acid")
    expect(storage.setItem).toHaveBeenCalledWith(
      "matriz-control:theme:v1",
      JSON.stringify({ version: 1, theme: "reactor-acid" }),
    )
  })
})
