import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { RuntimeInstance } from "../../domain/types"
import { EnvironmentManager } from "./environment-manager"

afterEach(() => { cleanup(); vi.restoreAllMocks() })

const runtime: RuntimeInstance = {
  id: "matriz-admin",
  label: "Matriz Admin",
  port: 3002,
  status: "ready",
  ownership: "managed",
  pid: 42,
  sessionId: "managed-1",
  endpoint: "http://localhost:3002",
  health: "healthy",
}

function gateway() {
  return {
    listEnvironments: vi.fn().mockResolvedValue([{ fileName: ".env.local", size: 42, modifiedAt: 1 }, { fileName: ".env.example", size: 20, modifiedAt: 1 }]),
    readEnvironment: vi.fn().mockResolvedValue({
      appId: "matriz-admin",
      fileName: ".env.local",
      revision: "rev-1",
      missingRequired: ["REQUIRED_KEY"],
      variables: [
        { key: "DATABASE_URL", sensitive: true, source: ".env.local" },
        { key: "PORT", value: "3002", sensitive: false, source: ".env.local" },
      ],
    }),
    revealEnvironmentValue: vi.fn().mockResolvedValue("postgres://private"),
    saveEnvironment: vi.fn().mockImplementation(async (request) => ({
      ...request,
      revision: "rev-2",
      missingRequired: [],
      variables: request.variables.map((variable: { key: string; value?: string }) => ({
        ...variable,
        sensitive: variable.key === "DATABASE_URL",
        source: request.fileName,
      })),
    })),
  } as unknown as DesktopGateway
}

describe("EnvironmentManager", () => {
  it("keeps secrets masked until the user explicitly reveals one", async () => {
    const desktop = gateway()
    render(<EnvironmentManager gateway={desktop} runtimes={[runtime]} restart={vi.fn()} signal={vi.fn()} />)

    expect(await screen.findByDisplayValue("••••••••")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Revelar DATABASE_URL" }))

    expect(await screen.findByDisplayValue("postgres://private")).toBeVisible()
    expect(desktop.revealEnvironmentValue).toHaveBeenCalledWith("matriz-admin", ".env.local", "DATABASE_URL")
  })

  it("saves the revision and restarts only a managed runtime", async () => {
    const desktop = gateway()
    const restart = vi.fn().mockResolvedValue(undefined)
    render(<EnvironmentManager gateway={desktop} runtimes={[runtime]} restart={restart} signal={vi.fn()} />)

    await screen.findByText("REQUIRED_KEY")
    fireEvent.click(screen.getByRole("button", { name: "Aplicar e reiniciar Matriz Admin" }))

    await waitFor(() => expect(desktop.saveEnvironment).toHaveBeenCalledWith(expect.objectContaining({ revision: "rev-1" })))
    expect(restart).toHaveBeenCalledWith("matriz-admin")
  })

  it("does not discard a dirty draft without confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)
    const desktop = gateway()
    render(<EnvironmentManager gateway={desktop} runtimes={[runtime]} restart={vi.fn()} signal={vi.fn()} />)
    const port = await screen.findByLabelText("Valor PORT")
    fireEvent.change(port, { target: { value: "3999" } })
    expect(document.querySelector(".env-footer span")).toHaveTextContent("1 alterações não salvas · segredos permanecem fora do histórico")
    fireEvent.change(screen.getByLabelText("Arquivo de ambiente"), { target: { value: ".env.example" } })
    expect(screen.getByLabelText("Arquivo de ambiente")).toHaveValue(".env.local")
    expect(window.confirm).toHaveBeenCalledOnce()
  })
})
