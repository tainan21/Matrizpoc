import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { CommerceSnapshot } from "../../domain/types"
import { StoreView } from "./store-view"

afterEach(cleanup)

function snapshot(owned = false, installed = false): CommerceSnapshot {
  return { wallet: { balance: owned ? 1030 : 1250, currency: "M", transactions: [] }, packages: [{ id: "matriz.analytics", name: "Matriz Analytics", description: "Dashboards operacionais.", developer: "Matriz Team", version: "1.0.0", category: "Analytics", appId: "willdash", price: 220, permissions: ["runtime:observe"], compatibility: "Windows 10/11", owned, installed, trustStatus: installed ? "verified" : "missing", receipt: installed ? { packageId: "matriz.analytics", version: "1.0.0", manifestDigest: "abc", grantedPermissions: ["runtime:observe"], installedAt: 1 } : undefined }] }
}

describe("StoreView", () => {
  it("keeps acquisition and installation as separate working transitions", async () => {
    const gateway = {
      commerceSnapshot: vi.fn().mockResolvedValue(snapshot()),
      acquirePackage: vi.fn().mockResolvedValue(snapshot(true)),
      installPackage: vi.fn().mockResolvedValue(snapshot(true, true)),
      repairPackage: vi.fn().mockResolvedValue(snapshot(true, true)),
      uninstallPackage: vi.fn().mockResolvedValue(snapshot(true)),
      openRuntimeTarget: vi.fn().mockResolvedValue(undefined),
    } as unknown as DesktopGateway
    render(<StoreView gateway={gateway} signal={vi.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: "Adquirir Matriz Analytics por 220 M" }))
    await waitFor(() => expect(gateway.acquirePackage).toHaveBeenCalledWith("matriz.analytics"))
    fireEvent.click(await screen.findByRole("button", { name: "Instalar Matriz Analytics" }))
    expect(screen.getByRole("dialog", { name: "Permissões de Matriz Analytics" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Confirmar instalação de Matriz Analytics" })).toBeDisabled()
    fireEvent.click(screen.getByRole("checkbox", { name: "Permitir runtime:observe" }))
    fireEvent.click(screen.getByRole("button", { name: "Confirmar instalação de Matriz Analytics" }))
    await waitFor(() => expect(gateway.installPackage).toHaveBeenCalledWith("matriz.analytics", ["runtime:observe"]))
    expect(await screen.findByText("INSTALADO")).toBeVisible()
  })

  it("shows the native trust receipt and repairs a changed installation", async () => {
    const base = snapshot(true, true)
    const changed: CommerceSnapshot = { ...base, packages: base.packages.map((item) => ({ ...item, trustStatus: "changed" as const })) }
    const gateway = {
      commerceSnapshot: vi.fn().mockResolvedValue(changed),
      repairPackage: vi.fn().mockResolvedValue(snapshot(true, true)),
    } as unknown as DesktopGateway
    render(<StoreView gateway={gateway} signal={vi.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: "Inspecionar Matriz Analytics" }))
    expect(screen.getByText("MANIFESTO ALTERADO")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Reparar Matriz Analytics" }))
    await waitFor(() => expect(gateway.repairPackage).toHaveBeenCalledWith("matriz.analytics"))
    expect(await screen.findByText("VERIFICADO")).toBeVisible()
  })

  it("starts an installed package runtime before opening it", async () => {
    const gateway = {
      commerceSnapshot: vi.fn().mockResolvedValue(snapshot(true, true)),
      runtimeSnapshot: vi.fn()
        .mockResolvedValueOnce([{ id: "willdash", status: "stopped", ownership: "none" }])
        .mockResolvedValueOnce([{ id: "willdash", status: "ready", ownership: "managed" }]),
      startManagedOperation: vi.fn().mockResolvedValue(undefined),
      restartRuntime: vi.fn().mockResolvedValue(undefined),
      openRuntimeTarget: vi.fn().mockResolvedValue(undefined),
    } as unknown as DesktopGateway
    render(<StoreView gateway={gateway} signal={vi.fn()} />)
    fireEvent.click(await screen.findByRole("button", { name: "Abrir Matriz Analytics" }))
    await waitFor(() => expect(gateway.startManagedOperation).toHaveBeenCalledWith("app.willdash.web"))
    expect(gateway.restartRuntime).not.toHaveBeenCalled()
    await waitFor(() => expect(gateway.openRuntimeTarget).toHaveBeenCalledWith({ appId: "willdash", routePath: "/" }))
  })
})
