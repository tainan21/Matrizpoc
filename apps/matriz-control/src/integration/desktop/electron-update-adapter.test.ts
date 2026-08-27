import { describe, expect, it, vi } from "vitest"
import { ElectronUpdateAdapter, type ElectronUpdaterPort } from "./electron-update-adapter"

function updater(): ElectronUpdaterPort {
  return { autoDownload: true, autoInstallOnAppQuit: true, on: vi.fn(), checkForUpdates: vi.fn(async () => null), downloadUpdate: vi.fn(async () => []), quitAndInstall: vi.fn() }
}

describe("ElectronUpdateAdapter", () => {
  it("disables automatic download and install on quit", () => {
    const port = updater()
    new ElectronUpdateAdapter(port, { packaged: true, version: "0.1.0" })
    expect(port.autoDownload).toBe(false)
    expect(port.autoInstallOnAppQuit).toBe(false)
  })

  it("forwards release metadata as plain renderer-safe text", () => {
    const port = updater()
    const callbacks = new Map<string, (...args: any[]) => void>()
    vi.mocked(port.on).mockImplementation((name, listener) => { callbacks.set(name, listener); return port })
    const adapter = new ElectronUpdateAdapter(port, { packaged: true, version: "0.1.0" })
    const listener = vi.fn()
    adapter.subscribe(listener)
    callbacks.get("update-available")?.({ version: "0.2.0", releaseNotes: [{ note: "Mais leve" }, { note: "Seguro" }] })
    expect(listener).toHaveBeenCalledWith({ type: "available", version: "0.2.0", notes: "Mais leve\nSeguro" })
  })

  it("maps a missing packaged channel to unavailable", () => {
    const port = updater()
    const callbacks = new Map<string, (...args: any[]) => void>()
    vi.mocked(port.on).mockImplementation((name, listener) => { callbacks.set(name, listener); return port })
    const adapter = new ElectronUpdateAdapter(port, { packaged: true, version: "0.1.0" })
    const listener = vi.fn()
    adapter.subscribe(listener)
    callbacks.get("error")?.(new Error("ENOENT: app-update.yml"))
    expect(listener).toHaveBeenCalledWith({ type: "unavailable", message: expect.stringMatching(/canal/i) })
  })
})
