import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { CommerceSnapshot } from "../../domain/types"
import { StoreView } from "./store-view"

afterEach(() => { cleanup(); vi.restoreAllMocks() })

function snapshot(owned = false, installed = false): CommerceSnapshot {
  return { wallet: { balance: owned ? 1030 : 1250, currency: "M", transactions: [] }, packages: [{ id: "matriz.analytics", name: "Matriz Analytics", description: "Dashboards operacionais.", developer: "Matriz Team", version: "1.0.0", category: "Analytics", appId: "willdash", price: 220, permissions: ["runtime:observe"], compatibility: "Windows 10/11", owned, installed, trustStatus: installed ? "verified" : "missing", receipt: installed ? { packageId: "matriz.analytics", version: "1.0.0", manifestDigest: "abc", grantedPermissions: ["runtime:observe"], installedAt: 1 } : undefined }] }
}

describe("StoreView", () => {
  it("installs an available desktop product only after an explicit preview confirmation", async () => {
    const available: CommerceSnapshot = {
      wallet: { balance: 0, currency: "M", transactions: [] },
      packages: [{ id: "matriz.uninstall", name: "Matriz Uninstall", description: "Remoção controlada.", developer: "Matriz", version: "0.2.0", category: "Desktop Product", appId: "matriz-uninstall", price: 0, permissions: [], compatibility: "Windows 10/11", owned: false, installed: false, status: "Available / Signed Release Required", installable: true, openable: false }],
    }
    const installed: CommerceSnapshot = {
      ...available,
      packages: [{ ...available.packages[0], owned: true, installed: true, installable: false, status: "Installed / Verified Release" }],
    }
    const gateway = {
      commerceSnapshot: vi.fn().mockResolvedValueOnce(available).mockResolvedValueOnce(installed),
      previewStoreInstall: vi.fn().mockResolvedValue({ confirmationToken: "token-1", productId: "matriz.uninstall", displayName: "Matriz Uninstall", version: "0.2.0", sizeBytes: 42, publisher: "Matriz" }),
      confirmStoreInstall: vi.fn().mockResolvedValue({ productId: "matriz.uninstall", distributionProductId: "matriz-uninstall-tauri", releaseId: "release-1", version: "0.2.0", sha256: "a".repeat(64), installedAt: 1 }),
    } as unknown as DesktopGateway
    vi.spyOn(window, "confirm").mockReturnValue(true)
    render(<StoreView gateway={gateway} signal={vi.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: "Instalar Matriz Uninstall" }))
    await waitFor(() => expect(gateway.previewStoreInstall).toHaveBeenCalledWith("matriz.uninstall"))
    await waitFor(() => expect(gateway.confirmStoreInstall).toHaveBeenCalledWith("token-1"))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Publisher: Matriz"))
    expect(await screen.findByText("INSTALADO")).toBeVisible()
  })

  it("keeps the legacy wallet read-only and never offers simulated acquisition", async () => {
    const gateway = { commerceSnapshot: vi.fn().mockResolvedValue(snapshot()) } as unknown as DesktopGateway
    render(<StoreView gateway={gateway} signal={vi.fn()} />)

    expect(await screen.findByText("HISTÓRICO · SOMENTE LEITURA")).toBeVisible()
    expect(screen.queryByRole("button", { name: /Adquirir Matriz Analytics/ })).not.toBeInTheDocument()
    expect(screen.getByText("INDISPONÍVEL")).toBeVisible()
  })

  it("opens a built-in utility in Hub without commerce or runtime actions", async () => {
    const builtIn: CommerceSnapshot = { wallet: { balance: 1250, currency: "M", transactions: [] }, packages: [{ id: "matriz.node-sweep", name: "Node Sweep", description: "Limpeza segura.", developer: "Matriz", version: "1.0.0", category: "Core Utility", appId: "matriz-desktop", price: 0, permissions: [], compatibility: "Matriz Control 1.0+", owned: true, installed: true, trustStatus: "verified", builtIn: true, status: "Built-in / Enabled" }] }
    const gateway = {
      commerceSnapshot: vi.fn().mockResolvedValue(builtIn),
      activatePackage: vi.fn().mockResolvedValue({ kind: "control", packageId: "matriz.node-sweep", view: "hub", featureId: "node-sweep" }),
      runtimeSnapshot: vi.fn(),
      startManagedOperation: vi.fn(),
      uninstallPackage: vi.fn(),
    } as unknown as DesktopGateway
    const openControl = vi.fn()
    render(<StoreView gateway={gateway} signal={vi.fn()} openControl={openControl} />)
    fireEvent.click(await screen.findByRole("button", { name: "Abrir Node Sweep" }))
    await waitFor(() => expect(openControl).toHaveBeenCalledWith("node-sweep"))
    expect(gateway.runtimeSnapshot).not.toHaveBeenCalled()
    expect(gateway.startManagedOperation).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: "Desinstalar Node Sweep" })).not.toBeInTheDocument()
  })

  it("starts an installed package runtime before opening it", async () => {
    const gateway = {
      commerceSnapshot: vi.fn().mockResolvedValue(snapshot(true, true)),
      activatePackage: vi.fn().mockResolvedValue({ kind: "runtime", packageId: "matriz.analytics", appId: "willdash", operationId: "app.willdash.web", routePath: "/" }),
      runtimeSnapshot: vi.fn()
        .mockResolvedValueOnce([{ id: "willdash", status: "stopped", ownership: "none" }])
        .mockResolvedValueOnce([{ id: "willdash", status: "ready", ownership: "managed" }]),
      startManagedOperation: vi.fn().mockResolvedValue(undefined),
      restartRuntime: vi.fn().mockResolvedValue(undefined),
      openRuntimeTarget: vi.fn().mockResolvedValue(undefined),
    } as unknown as DesktopGateway
    render(<StoreView gateway={gateway} signal={vi.fn()} />)
    fireEvent.click(await screen.findByRole("button", { name: "Abrir Matriz Analytics" }))
    await waitFor(() => expect(gateway.activatePackage).toHaveBeenCalledWith("matriz.analytics"))
    await waitFor(() => expect(gateway.startManagedOperation).toHaveBeenCalledWith("app.willdash.web"))
    expect(gateway.restartRuntime).not.toHaveBeenCalled()
    await waitFor(() => expect(gateway.openRuntimeTarget).toHaveBeenCalledWith({ appId: "willdash", routePath: "/" }))
    expect(gateway.activatePackage).toHaveBeenCalledTimes(2)
  })

  it("serializes package open while native activation is pending", async () => {
    const target = { kind: "runtime" as const, packageId: "matriz.analytics", appId: "willdash" as const, operationId: "app.willdash.web" as const, routePath: "/" }
    let releaseActivation!: (value: typeof target) => void
    const activation = new Promise<typeof target>((resolve) => { releaseActivation = resolve })
    const gateway = {
      commerceSnapshot: vi.fn().mockResolvedValue(snapshot(true, true)),
      activatePackage: vi.fn().mockImplementationOnce(() => activation).mockResolvedValue(target),
      runtimeSnapshot: vi.fn().mockResolvedValue([{ id: "willdash", status: "ready", ownership: "managed" }]),
      startManagedOperation: vi.fn(),
      restartRuntime: vi.fn(),
      openRuntimeTarget: vi.fn().mockResolvedValue(undefined),
    } as unknown as DesktopGateway
    render(<StoreView gateway={gateway} signal={vi.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: "Abrir Matriz Analytics" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Abrir Matriz Analytics" })).toBeDisabled())

    releaseActivation(target)
    await waitFor(() => expect(gateway.openRuntimeTarget).toHaveBeenCalled())
    expect(gateway.activatePackage).toHaveBeenCalledTimes(2)
  })

  it("does not start a runtime when native package activation is rejected", async () => {
    const gateway = {
      commerceSnapshot: vi.fn().mockResolvedValue(snapshot(true, true)),
      activatePackage: vi.fn().mockRejectedValue(new Error("Package trust must be repaired before activation")),
      runtimeSnapshot: vi.fn(),
      startManagedOperation: vi.fn(),
      openRuntimeTarget: vi.fn(),
    } as unknown as DesktopGateway
    render(<StoreView gateway={gateway} signal={vi.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: "Abrir Matriz Analytics" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Package trust must be repaired before activation")
    expect(gateway.runtimeSnapshot).not.toHaveBeenCalled()
    expect(gateway.startManagedOperation).not.toHaveBeenCalled()
    expect(gateway.openRuntimeTarget).not.toHaveBeenCalled()
  })
})
