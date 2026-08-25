import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { RuntimeInstance } from "../../domain/types"
import { EnvironmentManager } from "./environment-manager"
import { requestWorkspaceNavigation } from "./navigation-guard"

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
    compareEnvironments: vi.fn().mockResolvedValue({
      appId: "matriz-admin",
      sourceFile: ".env.local",
      targetFile: ".env.example",
      targetRevision: "target-rev",
      entries: [
        { key: "DATABASE_URL", sensitive: true, status: "different" },
        { key: "PORT", sensitive: false, status: "equal", sourceValue: "3002", targetValue: "3002" },
      ],
    }),
    promoteEnvironment: vi.fn().mockResolvedValue({ appId: "matriz-admin", fileName: ".env.example", revision: "promoted", missingRequired: [], variables: [] }),
    findEnvironmentReferences: vi.fn().mockResolvedValue({ appId: "matriz-admin", key: "PORT", scannedFiles: 0, truncated: false, matches: [] }),
    openResourceInEditor: vi.fn().mockResolvedValue(undefined),
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

  it("does not expose a late secret response in another environment", async () => {
    let resolveReveal: (value: string) => void = () => undefined
    const reveal = new Promise<string>((resolve) => { resolveReveal = resolve })
    const desktop = gateway()
    vi.mocked(desktop.revealEnvironmentValue).mockReturnValue(reveal)
    vi.mocked(desktop.readEnvironment)
      .mockResolvedValueOnce({ appId: "matriz-admin", fileName: ".env.local", revision: "local", missingRequired: [], variables: [{ key: "DATABASE_URL", sensitive: true, source: ".env.local" }] })
      .mockResolvedValueOnce({ appId: "matriz-admin", fileName: ".env.example", revision: "example", missingRequired: [], variables: [{ key: "PORT", value: "3002", sensitive: false, source: ".env.example" }] })
    render(<EnvironmentManager gateway={desktop} runtimes={[runtime]} restart={vi.fn()} signal={vi.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: "Revelar DATABASE_URL" }))
    fireEvent.change(screen.getByLabelText("Arquivo de ambiente"), { target: { value: ".env.example" } })
    expect(await screen.findByLabelText("Valor PORT")).toHaveValue("3002")
    resolveReveal("postgres://must-not-cross-boundaries")

    await waitFor(() => expect(screen.queryByDisplayValue("postgres://must-not-cross-boundaries")).not.toBeInTheDocument())
  })

  it("keeps a changed secret dirty when it is hidden and blocks workspace navigation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)
    const desktop = gateway()
    render(<EnvironmentManager gateway={desktop} runtimes={[runtime]} restart={vi.fn()} signal={vi.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: "Revelar DATABASE_URL" }))
    fireEvent.change(await screen.findByLabelText("Valor DATABASE_URL"), { target: { value: "postgres://changed" } })
    fireEvent.click(screen.getByRole("button", { name: "Ocultar DATABASE_URL" }))

    expect(document.querySelector(".env-footer span")).toHaveTextContent("1 alterações não salvas")
    expect(requestWorkspaceNavigation()).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }))
    await waitFor(() => expect(desktop.saveEnvironment).toHaveBeenCalledWith(expect.objectContaining({
      variables: expect.arrayContaining([expect.objectContaining({ key: "DATABASE_URL", value: "postgres://changed" })]),
    })))
  })

  it("compares environments without exposing secrets and promotes selected keys", async () => {
    const desktop = gateway()
    render(<EnvironmentManager gateway={desktop} runtimes={[runtime]} restart={vi.fn()} signal={vi.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: "Comparar ambientes" }))
    expect(await screen.findByRole("heading", { name: "Comparação de ambientes" })).toBeVisible()
    expect(screen.getByText("VALOR PROTEGIDO")).toBeVisible()
    expect(screen.queryByText("postgres://private")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("checkbox", { name: "Selecionar DATABASE_URL" }))
    fireEvent.click(screen.getByRole("button", { name: "Promover 1 variável" }))

    await waitFor(() => expect(desktop.promoteEnvironment).toHaveBeenCalledWith({
      appId: "matriz-admin",
      sourceFile: ".env.local",
      targetFile: ".env.example",
      targetRevision: "target-rev",
      keys: ["DATABASE_URL"],
    }))
  })

  it("shows bounded source impact and opens a match in the editor", async () => {
    const desktop = gateway()
    vi.mocked(desktop.findEnvironmentReferences).mockResolvedValue({
      appId: "matriz-admin",
      key: "PORT",
      scannedFiles: 24,
      truncated: false,
      matches: [{ relativePath: "src/config.ts", line: 8, excerpt: "Referência a PORT" }],
    })
    render(<EnvironmentManager gateway={desktop} runtimes={[runtime]} restart={vi.fn()} signal={vi.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: "Ver impacto de PORT" }))
    expect(await screen.findByRole("heading", { name: "Impacto de PORT" })).toBeVisible()
    expect(screen.getByText("1 referência em 24 arquivos analisados")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Abrir src/config.ts no editor" }))

    expect(desktop.openResourceInEditor).toHaveBeenCalledWith("matriz-admin", "src/config.ts")
  })
})
