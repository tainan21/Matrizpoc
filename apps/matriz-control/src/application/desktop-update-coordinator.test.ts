import { describe, expect, it, vi } from "vitest"
import { DesktopUpdateCoordinator, type DesktopUpdateAdapter } from "./desktop-update-coordinator"

function adapter(packaged = true): DesktopUpdateAdapter & { emit(event: Parameters<DesktopUpdateAdapter["subscribe"]>[0] extends (event: infer T) => void ? T : never): void } {
  let listener: (event: any) => void = () => undefined
  return {
    packaged,
    currentVersion: "0.1.0",
    check: vi.fn(async () => undefined),
    download: vi.fn(async () => undefined),
    install: vi.fn(),
    subscribe(next) { listener = next; return () => { listener = () => undefined } },
    emit(event) { listener(event) },
  }
}

describe("DesktopUpdateCoordinator", () => {
  it("stays unavailable outside the packaged desktop", async () => {
    const fake = adapter(false)
    const coordinator = new DesktopUpdateCoordinator(fake)
    expect(await coordinator.check()).toMatchObject({ state: "unavailable", currentVersion: "0.1.0" })
    expect(fake.check).not.toHaveBeenCalled()
  })

  it("checks and downloads only after explicit commands", async () => {
    const fake = adapter()
    const coordinator = new DesktopUpdateCoordinator(fake)
    await coordinator.check()
    expect(fake.check).toHaveBeenCalledOnce()
    expect(fake.download).not.toHaveBeenCalled()
    fake.emit({ type: "available", version: "0.2.0", notes: "Mais leve" })
    expect(coordinator.status()).toMatchObject({ state: "available", availableVersion: "0.2.0", notes: "Mais leve" })
    await coordinator.download()
    expect(fake.download).toHaveBeenCalledOnce()
    fake.emit({ type: "progress", percent: 41.8 })
    expect(coordinator.status()).toMatchObject({ state: "downloading", progress: 42 })
  })

  it("installs only after the download completes", () => {
    const fake = adapter()
    const coordinator = new DesktopUpdateCoordinator(fake)
    expect(() => coordinator.install()).toThrow(/download/i)
    fake.emit({ type: "downloaded", version: "0.2.0", notes: null })
    expect(coordinator.install()).toMatchObject({ state: "downloaded", availableVersion: "0.2.0" })
    expect(fake.install).toHaveBeenCalledOnce()
  })

  it("keeps a valid recoverable snapshot when the installer refuses to start", () => {
    const fake = adapter()
    const coordinator = new DesktopUpdateCoordinator(fake)
    fake.emit({ type: "downloaded", version: "0.2.0", notes: null })
    vi.mocked(fake.install).mockImplementation(() => { throw new Error("installer refused") })

    expect(coordinator.install()).toMatchObject({ state: "error", currentVersion: "0.1.0", message: "installer refused" })
  })

  it("publishes renderer-safe snapshots for updater events", () => {
    const fake = adapter()
    const coordinator = new DesktopUpdateCoordinator(fake)
    const listener = vi.fn()
    coordinator.subscribe(listener)
    fake.emit({ type: "error", message: "release host unavailable" })
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ state: "error", message: "release host unavailable" }))
  })

  it("treats a missing packaged release channel as unavailable", () => {
    const fake = adapter()
    const coordinator = new DesktopUpdateCoordinator(fake)
    fake.emit({ type: "unavailable", message: "Canal de atualização não configurado." })
    expect(coordinator.status()).toMatchObject({ state: "unavailable" })
  })
})
