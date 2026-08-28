import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { DesktopGateway, DistributionCatalogV1 } from "../domain/types"
import { UninstallApp } from "./app"

const catalog: DistributionCatalogV1 = {
  schemaVersion: "v1", generatedAt: "2026-08-28T12:00:00.000Z", products: [
    { productId: "matriz-control-tauri", displayName: "Matriz Control", edition: "Tauri", runtime: "tauri", platform: "win32", arch: "x64", state: "active", release: null, windows: { uninstallKey: "Matriz Control", displayName: "Matriz Control", publisher: "Matriz", executableName: "matriz-control.exe", aliases: [] } },
    { productId: "matriz-control-electron", displayName: "Matriz Control", edition: "Electron", runtime: "electron", platform: "win32", arch: "x64", state: "active", release: null, windows: { uninstallKey: "electron-guid", displayName: "Matriz Control 0.1.0", publisher: "Matriz", executableName: "Matriz Control.exe", aliases: [] } },
  ],
}

describe("Matriz Uninstall UI", () => {
  it("keeps both Control installations visible and confirms exact destructive target", async () => {
    const uninstall = vi.fn().mockResolvedValue({ operationId: "op", status: "completed", message: "Removido" })
    const gateway = {
      shell: "tauri", listInstalled: vi.fn().mockResolvedValue([
        { installationId: "tauri", registryKey: "Matriz Control", displayName: "Matriz Control", publisher: "Matriz", version: "0.1.0", installLocation: "C:\\Tauri", estimatedBytes: 10 },
        { installationId: "electron", registryKey: "electron-guid", displayName: "Matriz Control 0.1.0", publisher: "Matriz", version: "0.1.0", installLocation: "C:\\Electron", estimatedBytes: 20 },
      ]), uninstall,
      install: vi.fn(), update: vi.fn(), reinstall: vi.fn(), cleanupPreview: vi.fn().mockResolvedValue([]), cleanup: vi.fn(), selfUninstall: vi.fn(),
    } satisfies DesktopGateway
    vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<UninstallApp gateway={gateway} loadCatalog={async () => catalog}/>)

    expect(await screen.findByText("Matriz Control · Tauri")).toBeVisible()
    expect(screen.getByText("Matriz Control · Electron")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Desinstalar Matriz Control · Electron" }))

    await waitFor(() => expect(uninstall).toHaveBeenCalledWith("electron"))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Matriz Control · Electron"))
  })
})

