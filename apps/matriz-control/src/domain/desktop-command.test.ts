import { describe, expect, it } from "vitest"
import { parseDesktopCommand } from "./desktop-bridge"

describe("parseDesktopCommand", () => {
  it("accepts only the closed desktop command surface", () => {
    expect(parseDesktopCommand({ type: "tab.navigate", tabId: "tab_1", input: "example.com" })).toEqual({ type: "tab.navigate", tabId: "tab_1", input: "example.com" })
    expect(() => parseDesktopCommand({ type: "shell.run", command: "whoami" })).toThrow(/unsupported/i)
    expect(() => parseDesktopCommand({ type: "page.type", tabId: "tab_1", ref: "m1", text: "x".repeat(100_001) })).toThrow(/invalid/i)
  })
})
