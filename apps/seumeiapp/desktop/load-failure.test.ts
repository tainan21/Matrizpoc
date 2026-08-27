import { describe, expect, it } from "vitest"
import { shouldShowOfflinePage } from "./load-failure"

describe("shouldShowOfflinePage", () => {
  it("reports main-frame network failures for trusted web origins", () => {
    expect(shouldShowOfflinePage(-106, true, "https://seumei.matriz.example/workspace", ["https://seumei.matriz.example"])).toBe(true)
    expect(shouldShowOfflinePage(-3, true, "https://seumei.matriz.example/workspace", ["https://seumei.matriz.example"])).toBe(false)
    expect(shouldShowOfflinePage(-106, false, "https://seumei.matriz.example/image.png", ["https://seumei.matriz.example"])).toBe(false)
  })
})
