import { describe, expect, it } from "vitest"
import { configureManualUpdater } from "./updater-policy"

describe("manual updater policy", () => {
  it("disables automatic download and install and exposes trusted native actions", async () => {
    const calls: string[] = []
    const updater = {
      autoDownload: true, autoInstallOnAppQuit: true,
      checkForUpdates: async () => { calls.push("check") },
      downloadUpdate: async () => { calls.push("download") },
      quitAndInstall: () => { calls.push("install") },
    }
    const actions = configureManualUpdater(updater)
    expect(updater.autoDownload).toBe(false)
    expect(updater.autoInstallOnAppQuit).toBe(false)
    await actions.check(); await actions.download(); actions.install()
    expect(calls).toEqual(["check", "download", "install"])
  })
})
