import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { CommerceSnapshot } from "../../domain/types"
import { StoreView } from "./store-view"

afterEach(cleanup)

function snapshot(owned = false, installed = false): CommerceSnapshot {
  return { wallet: { balance: owned ? 1030 : 1250, currency: "M", transactions: [] }, packages: [{ id: "matriz.analytics", name: "Matriz Analytics", description: "Dashboards operacionais.", developer: "Matriz Team", version: "1.0.0", category: "Analytics", appId: "willdash", price: 220, permissions: ["runtime:observe"], compatibility: "Windows 10/11", owned, installed }] }
}

describe("StoreView", () => {
  it("keeps acquisition and installation as separate working transitions", async () => {
    const gateway = {
      commerceSnapshot: vi.fn().mockResolvedValue(snapshot()),
      acquirePackage: vi.fn().mockResolvedValue(snapshot(true)),
      installPackage: vi.fn().mockResolvedValue(snapshot(true, true)),
      uninstallPackage: vi.fn().mockResolvedValue(snapshot(true)),
      openRuntimeTarget: vi.fn().mockResolvedValue(undefined),
    } as unknown as DesktopGateway
    render(<StoreView gateway={gateway} signal={vi.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: "Adquirir Matriz Analytics por 220 M" }))
    await waitFor(() => expect(gateway.acquirePackage).toHaveBeenCalledWith("matriz.analytics"))
    fireEvent.click(await screen.findByRole("button", { name: "Instalar Matriz Analytics" }))
    await waitFor(() => expect(gateway.installPackage).toHaveBeenCalledWith("matriz.analytics"))
    expect(await screen.findByText("INSTALADO")).toBeVisible()
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
