import { describe, expect, it, vi } from "vitest"
import { createManualUpdater } from "./manual-updater"

describe("createManualUpdater", () => {
  it("disables automatic download and quit-time installation", async () => {
    const adapter = { autoDownload: true, autoInstallOnAppQuit: true, checkForUpdates: vi.fn(), downloadUpdate: vi.fn(), quitAndInstall: vi.fn() }
    const updater = createManualUpdater(adapter)
    expect(adapter.autoDownload).toBe(false)
    expect(adapter.autoInstallOnAppQuit).toBe(false)
    await updater.check()
    expect(adapter.checkForUpdates).toHaveBeenCalledOnce()
    expect(adapter.downloadUpdate).not.toHaveBeenCalled()
    expect(adapter.quitAndInstall).not.toHaveBeenCalled()
  })
})
