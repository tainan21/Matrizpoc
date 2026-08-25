import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { RuntimeInstance } from "../../domain/types"
import { RuntimeWorkspace } from "./runtime-workspace"

afterEach(cleanup)

function gateway() {
  return {
    activityHistory: vi.fn().mockResolvedValue([]),
    subscribeActivity: vi.fn().mockResolvedValue(undefined),
    getNativeAppRuntime: vi.fn().mockResolvedValue({ appId: "matriz-admin", state: "not-built" }),
    recoverRuntime: vi.fn().mockResolvedValue({ appId: "matriz-admin", status: "ready", sessionId: "recovered-1" }),
    commerceSnapshot: vi.fn().mockResolvedValue({
      wallet: { balance: 1000, currency: "M", transactions: [] },
      packages: [{ id: "matriz.admin-tools", name: "Admin Tools", description: "Ferramentas operacionais.", developer: "Matriz Team", version: "1.1.0", category: "Developer Tools", appId: "matriz-admin", price: 250, permissions: ["runtime:start"], compatibility: "Windows 10/11", owned: true, installed: true, trustStatus: "verified" }],
    }),
  } as unknown as DesktopGateway
}

const degraded: RuntimeInstance = {
  id: "matriz-admin",
  label: "Matriz Admin",
  port: 3002,
  status: "degraded",
  ownership: "managed",
  sessionId: "failed-1",
  endpoint: "http://localhost:3002/",
  health: "unhealthy",
}

describe("RuntimeWorkspace recovery", () => {
  it("shows verified Store capabilities associated with the selected runtime", async () => {
    render(<RuntimeWorkspace gateway={gateway()} runtimes={[degraded]} refresh={vi.fn()} startOperation={vi.fn()} openTerminal={vi.fn()} signal={vi.fn()} executeAction={async (action) => action()} />)

    expect(await screen.findByLabelText("1 capacidade ativa: Admin Tools")).toBeVisible()
  })

  it("offers one contextual recovery action for a managed degraded runtime", async () => {
    const desktop = gateway()
    const refresh = vi.fn().mockResolvedValue(undefined)
    render(<RuntimeWorkspace gateway={desktop} runtimes={[degraded]} refresh={refresh} startOperation={vi.fn()} openTerminal={vi.fn()} signal={vi.fn()} executeAction={async (action) => action()} />)

    expect(await screen.findByText("O último processo encerrou antes da porta ficar pronta.")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Recuperar Matriz Admin" }))

    await waitFor(() => expect(desktop.recoverRuntime).toHaveBeenCalledWith("matriz-admin"))
    expect(refresh).toHaveBeenCalled()
  })

  it("never offers process takeover for an external runtime", async () => {
    const desktop = gateway()
    render(<RuntimeWorkspace gateway={desktop} runtimes={[{ ...degraded, ownership: "external" }]} refresh={vi.fn()} startOperation={vi.fn()} openTerminal={vi.fn()} signal={vi.fn()} executeAction={async (action) => action()} />)

    expect(await screen.findByText("A porta pertence a outro processo e será preservada.")).toBeVisible()
    expect(screen.queryByRole("button", { name: "Recuperar Matriz Admin" })).not.toBeInTheDocument()
  })
})
