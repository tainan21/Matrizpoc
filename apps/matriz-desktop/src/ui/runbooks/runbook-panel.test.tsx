import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { RuntimeInstance } from "../../domain/types"
import { RunbookPanel } from "./runbook-panel"

afterEach(cleanup)

const runtime: RuntimeInstance = { id: "matriz-admin", label: "Matriz Admin", port: 3002, status: "stopped", ownership: "none", endpoint: "http://localhost:3002/", health: "offline" }

describe("RunbookPanel", () => {
  it("runs only a native catalog entry and exposes its returned target", async () => {
    const gateway = {
      runbookCatalog: vi.fn().mockResolvedValue([
        { id: "validate-environment", label: "Validar ambiente", description: "Valida o projeto.", steps: ["environment.validate", "doctor.run"] },
        { id: "recover-open", label: "Recuperar e abrir", description: "Recupera o runtime.", steps: ["runtime.recover", "runtime.open"] },
        { id: "apply-visualize", label: "Aplicar e visualizar", description: "Prepara a visualização.", steps: ["environment.validate", "runtime.recover", "preview.offer"] },
      ]),
      runRunbook: vi.fn().mockResolvedValue({ runbookId: "apply-visualize", appId: "matriz-admin", status: "completed", steps: [
        { stepId: "environment.validate", status: "completed", detail: "Ambiente válido" },
        { stepId: "runtime.recover", status: "completed", detail: "Runtime pronto" },
        { stepId: "preview.offer", status: "available", detail: "Aplicação pronta" },
      ], target: { appId: "matriz-admin", routePath: "/" } }),
      openRuntimeTarget: vi.fn().mockResolvedValue(undefined),
    } as unknown as DesktopGateway
    render(<RunbookPanel gateway={gateway} runtimes={[runtime]} signal={vi.fn()} />)

    expect(await screen.findByRole("button", { name: "Selecionar Validar ambiente" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Selecionar Recuperar e abrir" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Selecionar Aplicar e visualizar" }))
    expect(screen.getByText("preview.offer")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Executar Aplicar e visualizar em Matriz Admin" }))

    await waitFor(() => expect(gateway.runRunbook).toHaveBeenCalledWith("apply-visualize", "matriz-admin"))
    expect(screen.getByText("Aplicação pronta")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Abrir app Matriz Admin" }))
    expect(gateway.openRuntimeTarget).toHaveBeenCalledWith({ appId: "matriz-admin", routePath: "/" })
  })
})
