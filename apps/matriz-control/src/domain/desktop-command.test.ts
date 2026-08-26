import { describe, expect, it } from "vitest"
import { parseDesktopCommand } from "./desktop-bridge"

describe("parseDesktopCommand", () => {
  it("accepts only the closed desktop command surface", () => {
    expect(parseDesktopCommand({ type: "tab.navigate", tabId: "tab_1", input: "example.com" })).toEqual({ type: "tab.navigate", tabId: "tab_1", input: "example.com" })
    expect(() => parseDesktopCommand({ type: "shell.run", command: "whoami" })).toThrow(/unsupported/i)
    expect(() => parseDesktopCommand({ type: "page.type", tabId: "tab_1", ref: "m1", text: "x".repeat(100_001) })).toThrow(/invalid/i)
  })

  it("accepts fixed Workbench operations without browser supplied URLs or paths", () => {
    expect(parseDesktopCommand({ type: "workbench.status", url: "https://evil.example" }))
      .toEqual({ type: "workbench.status" })
    expect(parseDesktopCommand({ type: "workbench.open", path: "C:/secret" }))
      .toEqual({ type: "workbench.open" })
    expect(parseDesktopCommand({ type: "workbench.restart", command: "whoami" }))
      .toEqual({ type: "workbench.restart" })
  })

  it("accepts the read-only host health snapshot command without a payload", () => {
    expect(parseDesktopCommand({ type: "health.host-snapshot", ignored: "value" }))
      .toEqual({ type: "health.host-snapshot" })
    expect(() => parseDesktopCommand({ type: "health.host-snapshot-v2" })).toThrow(/unsupported/i)
  })

})
