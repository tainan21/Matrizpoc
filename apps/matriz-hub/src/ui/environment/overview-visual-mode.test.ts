import { describe, expect, it } from "vitest"
import { parseOverviewVisualMode } from "./overview-visual-mode"

describe("overview visual mode preference", () => {
  it.each(["auto", "3d", "2d"] as const)("accepts %s", (mode) => {
    expect(parseOverviewVisualMode(mode)).toBe(mode)
  })

  it.each([null, undefined, "", "webgl", "AUTO", "map"])(
    "falls back to auto for invalid stored value %s",
    (value) => {
      expect(parseOverviewVisualMode(value)).toBe("auto")
    },
  )
})
