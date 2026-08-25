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
