import { describe, expect, it } from "vitest"
import { createWorkbenchDesktopWebPreferences, isAllowedWorkbenchDesktopUrl } from "./shell-policy"

describe("native desktop shell policy", () => {
  it("creates an isolated sandboxed renderer without Node integration", () => {
    expect(createWorkbenchDesktopWebPreferences()).toEqual({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    })
  })

  it("allows navigation only to the fixed local Workbench origin", () => {
    expect(isAllowedWorkbenchDesktopUrl("http://127.0.0.1:3005/work/inbox")).toBe(true)
    expect(isAllowedWorkbenchDesktopUrl("https://127.0.0.1:3005/")).toBe(false)
    expect(isAllowedWorkbenchDesktopUrl("http://localhost:3005/")).toBe(false)
    expect(isAllowedWorkbenchDesktopUrl("https://example.com/")).toBe(false)
  })
})
