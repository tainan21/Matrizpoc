import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import { InfrastructureView } from "./infrastructure-view"

afterEach(() => cleanup())

const snapshot = {
  revision: "infra-rev-1",
  root: "C:\\Users\\taina\\AppData\\Local\\Matriz\\Infrastructure",
  services: [
    { id: "postgres" as const, displayName: "PostgreSQL", version: "17.11", ports: [55432], state: "not_installed" as const, message: "Não instalado" },
    { id: "garnet" as const, displayName: "Garnet", version: "2.1.5", ports: [46379], state: "healthy" as const, message: "Saudável" },
    { id: "nats" as const, displayName: "NATS JetStream", version: "2.14.5", ports: [54222, 58222], state: "external_unowned" as const, message: "Porta ocupada por processo externo" },
  ],
}

describe("InfrastructureView", () => {
  it("requires preview and explicit confirmation before mutating a service", async () => {
    const gateway = {
      infrastructureSnapshot: vi.fn().mockResolvedValue(snapshot),
      previewInfrastructureAction: vi.fn().mockResolvedValue({
        confirmationToken: "one-use-token",
        targetId: "postgres",
        actionId: "install",
        title: "Instalar PostgreSQL",
        impact: ["Execução local e portátil"],
        expiresAt: Date.now() + 30_000,
      }),
      confirmInfrastructureAction: vi.fn().mockResolvedValue({
        ...snapshot,
        revision: "infra-rev-2",
        services: snapshot.services.map((service) => service.id === "postgres" ? { ...service, state: "stopped" as const, message: "Parado" } : service),
      }),
      infrastructureLogs: vi.fn().mockResolvedValue([]),
    } as unknown as DesktopGateway

    render(<InfrastructureView gateway={gateway} />)
    fireEvent.click(await screen.findByRole("button", { name: "Instalar PostgreSQL" }))

    expect(gateway.previewInfrastructureAction).toHaveBeenCalledWith({
      targetId: "postgres",
      actionId: "install",
      revision: "infra-rev-1",
    })
    expect(gateway.confirmInfrastructureAction).not.toHaveBeenCalled()

    fireEvent.click(await screen.findByRole("button", { name: "Confirmar operação" }))
    await waitFor(() => expect(gateway.confirmInfrastructureAction).toHaveBeenCalledWith("one-use-token"))
    expect(await screen.findByText("Parado")).toBeVisible()
  })

  it("shows external ownership and keeps local failures inside the cockpit", async () => {
    const gateway = {
      infrastructureSnapshot: vi.fn().mockResolvedValue(snapshot),
      previewInfrastructureAction: vi.fn().mockRejectedValue(new Error("A porta pertence a outro processo")),
      infrastructureLogs: vi.fn().mockResolvedValue(["NATS ready"]),
    } as unknown as DesktopGateway

    render(<InfrastructureView gateway={gateway} />)
    expect(await screen.findByText("Porta ocupada por processo externo")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Inspecionar logs do NATS JetStream" }))
    expect(await screen.findByText("NATS ready")).toBeVisible()
  })
})
