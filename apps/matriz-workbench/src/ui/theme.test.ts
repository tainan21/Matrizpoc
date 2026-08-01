import { describe, expect, it } from "vitest"
import { normalizeTheme } from "./theme"

describe("normalizeTheme", () => {
  it("accepts only explicit light and dark preferences", () => {
    expect(normalizeTheme("light")).toBe("light")
    expect(normalizeTheme("dark")).toBe("dark")
    expect(normalizeTheme("system")).toBeUndefined()
    expect(normalizeTheme(undefined)).toBeUndefined()
  })
})
