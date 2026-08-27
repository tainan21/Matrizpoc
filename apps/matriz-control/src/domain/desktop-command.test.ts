import { describe, expect, it } from "vitest"
import { assertAgentDesktopCommand, parseDesktopCommand } from "./desktop-bridge"

describe("parseDesktopCommand", () => {
  it("accepts only the closed desktop command surface", () => {
    expect(parseDesktopCommand({ type: "tab.navigate", tabId: "tab_1", input: "example.com" })).toEqual({ type: "tab.navigate", tabId: "tab_1", input: "example.com" })
    expect(() => parseDesktopCommand({ type: "shell.run", command: "whoami" })).toThrow(/unsupported/i)
    expect(() => parseDesktopCommand({ type: "page.type", tabId: "tab_1", ref: "m1", text: "x".repeat(100_001) })).toThrow(/invalid/i)
  })

  it("accepts the read-only host health snapshot command without a payload", () => {
    expect(parseDesktopCommand({ type: "health.host-snapshot", ignored: "value" }))
      .toEqual({ type: "health.host-snapshot" })
    expect(() => parseDesktopCommand({ type: "health.host-snapshot-v2" })).toThrow(/unsupported/i)
  })

  it.each(["update.status", "update.check", "update.download", "update.install"])("accepts payload-free %s", (type) => {
    expect(parseDesktopCommand({ type })).toEqual({ type })
  })

  it.each(["update.status", "update.check", "update.download", "update.install"])("rejects payload on %s", (type) => {
    expect(() => parseDesktopCommand({ type, url: "https://evil.example" })).toThrow(/payload/i)
  })

  it("keeps updater commands out of the MCP command surface", () => {
    expect(() => assertAgentDesktopCommand({ type: "update.check" })).toThrow(/human interface/i)
  })

  it("accepts Store app operations with only a catalog app id and keeps them out of MCP", () => {
    expect(() => parseDesktopCommand({ type: "store.apps.status", path: "C:/ignored" })).toThrow(/payload/i)
    expect(() => parseDesktopCommand({ type: "store.app.download", appId: "matriz-workbench", url: "https://evil.example" })).toThrow(/payload/i)
    expect(() => parseDesktopCommand({ type: "store.app.cancel-download", appId: "seumei", command: "whoami" })).toThrow(/payload/i)
    expect(parseDesktopCommand({ type: "store.app.install", appId: "seumei" })).toEqual({ type: "store.app.install", appId: "seumei" })
    expect(parseDesktopCommand({ type: "store.app.open", appId: "seumei" })).toEqual({ type: "store.app.open", appId: "seumei" })
    expect(parseDesktopCommand({ type: "store.app.uninstall", appId: "seumei" })).toEqual({ type: "store.app.uninstall", appId: "seumei" })
    expect(parseDesktopCommand({ type: "store.app.check-update", appId: "seumei" })).toEqual({ type: "store.app.check-update", appId: "seumei" })
    expect(() => parseDesktopCommand({ type: "store.app.download", appId: "unknown" })).toThrow(/invalid/i)
    expect(() => assertAgentDesktopCommand({ type: "store.app.install", appId: "seumei" })).toThrow(/human interface/i)
  })

})
