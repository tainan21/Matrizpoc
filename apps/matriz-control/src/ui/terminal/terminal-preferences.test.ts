import { describe, expect, it } from "vitest"
import { parseTerminalPreferences } from "./terminal-preferences"

describe("terminal preferences", () => {
  it("returns safe defaults for corrupt storage", () => {
    expect(parseTerminalPreferences("not-json")).toEqual({ open: false, placement: "bottom", bottomSize: 320, rightSize: 520, activeSessionId: null })
  })

  it("clamps dimensions and validates placement", () => {
    const parsed = parseTerminalPreferences(JSON.stringify({ open: true, placement: "floating", bottomSize: 9999, rightSize: 2, activeSessionId: "session-1" }))
    expect(parsed).toEqual({ open: true, placement: "bottom", bottomSize: 720, rightSize: 360, activeSessionId: "session-1" })
  })
})
