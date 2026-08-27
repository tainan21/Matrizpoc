import { describe, expect, it } from "vitest"
import { createElectronSecurityPolicy } from "./electron-security"

const policy = createElectronSecurityPolicy([
  "https://seumei.matriz.example",
  "https://hub.matriz.example",
])

describe("createElectronSecurityPolicy", () => {
  it("creates an isolated persistent remote-content session without a preload bridge", () => {
    expect(policy.browserWindowOptions).toEqual({
      partition: "persist:seumei",
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    })
  })

  it("denies every permission and download request", () => {
    expect(policy.permitsPermission("notifications")).toBe(false)
    expect(policy.permitsDownload()).toBe(false)
  })

  it("denies popups while routing ordinary external HTTPS targets to the system browser", () => {
    expect(policy.decideWindowOpen("https://docs.example.com/help")).toEqual({
      action: "deny",
      openExternally: true,
    })
    expect(policy.decideWindowOpen("javascript:alert(1)")).toEqual({
      action: "deny",
      openExternally: false,
    })
  })
})
