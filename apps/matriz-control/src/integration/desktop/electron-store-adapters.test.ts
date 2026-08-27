import { describe, expect, it } from "vitest"
import { isApprovedUninstallKey, publisherSubjectMatches, safeInstalledPath } from "../../../desktop/electron-store-adapters"

describe("Electron Store package boundaries", () => {
  it("accepts only the exact catalog uninstall registry identity", () => {
    expect(isApprovedUninstallKey("HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\com.matriz.workbench", "com.matriz.workbench")).toBe(true)
    expect(isApprovedUninstallKey("HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\forged", "com.matriz.workbench")).toBe(false)
  })

  it("keeps executable and uninstaller paths inside the observed install directory", () => {
    expect(safeInstalledPath("C:\\Program Files\\Matriz", "Workbench.exe")).toBe("C:\\Program Files\\Matriz\\Workbench.exe")
    expect(() => safeInstalledPath("C:\\Program Files\\Matriz", "..\\evil.exe")).toThrow(/path/i)
  })

  it("requires an exact Authenticode organization or common name", () => {
    expect(publisherSubjectMatches("CN=Matriz, O=Matriz, C=BR", "Matriz")).toBe(true)
    expect(publisherSubjectMatches("CN=Matriz Evil, O=Other, C=BR", "Matriz")).toBe(false)
  })
})
