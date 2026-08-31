import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { DesktopGateway, DistributionCatalogV1 } from "../domain/types"
import { UninstallApp } from "./app"

const catalog: DistributionCatalogV1 = {
  schemaVersion: "v1",
  generatedAt: "2026-08-28T12:00:00.000Z",
  products: [
    {
      productId: "matriz-control-tauri",
      displayName: "Matriz Control",
      edition: "Tauri",
      runtime: "tauri",
      platform: "win32",
      arch: "x64",
      state: "active",
      release: null,
      windows: {
        uninstallKey: "Matriz Control",
        displayName: "Matriz Control",
        publisher: "Matriz",
        executableName: "matriz-control.exe",
        aliases: [],
      },
    },
    {
      productId: "matriz-control-electron",
      displayName: "Matriz Control",
      edition: "Electron",
      runtime: "electron",
      platform: "win32",
      arch: "x64",
      state: "active",
      release: null,
      windows: {
        uninstallKey: "electron-guid",
        displayName: "Matriz Control 0.1.0",
        publisher: "Matriz",
        executableName: "Matriz Control.exe",
        aliases: [],
      },
    },
  ],
}

afterEach(cleanup)

describe("Matriz Uninstall UI", () => {
  it("keeps both Control installations visible and confirms exact destructive target", async () => {
    const uninstall = vi
      .fn()
      .mockResolvedValue({ operationId: "op", status: "completed", message: "Removido" })
    const gateway = {
      shell: "tauri",
      listInstalled: vi.fn().mockResolvedValue([
        {
          installationId: "tauri",
          registryKey: "Matriz Control",
          displayName: "Matriz Control",
          publisher: "Matriz",
          version: "0.1.0",
          installLocation: "C:\\Tauri",
          estimatedBytes: 10,
        },
        {
          installationId: "electron",
          registryKey: "electron-guid",
          displayName: "Matriz Control 0.1.0",
          publisher: "Matriz",
          version: "0.1.0",
          installLocation: "C:\\Electron",
          estimatedBytes: 20,
        },
      ]),
      uninstall,
      install: vi.fn(),
      update: vi.fn(),
      reinstall: vi.fn(),
      cleanupPreview: vi.fn().mockResolvedValue([]),
      cleanup: vi.fn(),
      selfUninstall: vi.fn(),
      chooseLocalInstallerFolder: vi.fn().mockResolvedValue(null),
      scanLocalInstallers: vi.fn().mockResolvedValue([]),
      prepareInstaller: vi.fn(), confirmInstaller: vi.fn(), cancelInstaller: vi.fn(), installerOperation: vi.fn(),
    } satisfies DesktopGateway
    render(<UninstallApp gateway={gateway} loadCatalog={async () => catalog} />)

    expect((await screen.findAllByText("Matriz Control · Tauri"))[0]).toBeVisible()
    const electronLabels = screen.getAllByText("Matriz Control · Electron")
    expect(electronLabels[0]).toBeVisible()
    fireEvent.click(electronLabels[0])
    fireEvent.click(screen.getByRole("button", { name: "Desinstalar Matriz Control · Electron" }))

    expect(screen.getByRole("dialog", { name: "Confirmar desinstalação" })).toBeVisible()
    expect(screen.getByText("Matriz Control · Electron", { selector: "strong" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Confirmar desinstalação" }))
    await waitFor(() => expect(uninstall).toHaveBeenCalledWith("electron"))
  })

  it("offers navigation, filters and theme choices without losing product context", async () => {
    const gateway = {
      shell: "tauri",
      listInstalled: vi.fn().mockResolvedValue([]),
      uninstall: vi.fn(), install: vi.fn(), update: vi.fn(), reinstall: vi.fn(),
      cleanupPreview: vi.fn().mockResolvedValue([]), cleanup: vi.fn(), selfUninstall: vi.fn(),
      chooseLocalInstallerFolder: vi.fn().mockResolvedValue(null),
      scanLocalInstallers: vi.fn().mockResolvedValue([]),
      prepareInstaller: vi.fn(), confirmInstaller: vi.fn(), cancelInstaller: vi.fn(), installerOperation: vi.fn(),
    } satisfies DesktopGateway
    render(<UninstallApp gateway={gateway} loadCatalog={async () => catalog} />)

    expect(await screen.findByRole("heading", { name: "Produtos Matriz" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Tema claro" }))
    expect(screen.getByTestId("uninstall-shell")).toHaveAttribute("data-theme", "light")
    fireEvent.click(screen.getByRole("tab", { name: "Atualizações" }))
    expect(screen.getByRole("heading", { name: "Atualizações" })).toBeVisible()
  })

  it("selects a native folder and renders sanitized local installers", async () => {
    const chooseLocalInstallerFolder = vi.fn().mockResolvedValue({ folderId: "folder-1", label: "Builds locais" })
    const scanLocalInstallers = vi.fn().mockResolvedValue([{
      installerId: "installer-1", productId: "matriz-control-tauri", displayName: "Matriz Control",
      version: "1.0.0", sizeBytes: 1024, sha256: "a".repeat(64), trust: "signed-matriz",
      isLatestForProduct: true, isDowngrade: false, message: "Assinatura Matriz válida.",
    }])
    const gateway = {
      shell: "tauri", listInstalled: vi.fn().mockResolvedValue([]), uninstall: vi.fn(), install: vi.fn(), update: vi.fn(), reinstall: vi.fn(),
      cleanupPreview: vi.fn().mockResolvedValue([]), cleanup: vi.fn(), selfUninstall: vi.fn(),
      chooseLocalInstallerFolder, scanLocalInstallers,
      prepareInstaller: vi.fn(), confirmInstaller: vi.fn(), cancelInstaller: vi.fn(), installerOperation: vi.fn(),
    } satisfies DesktopGateway
    render(<UninstallApp gateway={gateway} loadCatalog={async () => catalog} />)
    await screen.findByRole("heading", { name: "Produtos Matriz" })

    fireEvent.click(screen.getByRole("tab", { name: "Instaladores locais" }))
    fireEvent.click(screen.getByRole("button", { name: "Escolher pasta" }))

    expect(await screen.findByText("Matriz Control 1.0.0")).toBeVisible()
    expect(screen.getByText("Mais recente local")).toBeVisible()
    expect(scanLocalInstallers).toHaveBeenCalledWith("folder-1")
  })
})
