import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { RuntimeInstance } from "../../domain/types"
import { FileExplorer } from "./file-explorer"

afterEach(cleanup)

const runtime = { id: "matriz-admin", label: "Matriz Admin", port: 3002, status: "ready", ownership: "managed", endpoint: "http://localhost:3002", health: "healthy" } as RuntimeInstance

function gateway() {
  return {
    listDirectory: vi.fn().mockImplementation(async (_appId, path) => ({ appId: "matriz-admin", relativePath: path, entries: path === "src" ? [
      { name: "dashboard.tsx", relativePath: "src/dashboard.tsx", isDirectory: false, size: 1200, modifiedAt: 1, extension: "tsx" },
    ] : [{ name: "src", relativePath: "src", isDirectory: true, size: 0, modifiedAt: 1 }] })),
    previewFile: vi.fn().mockResolvedValue({ appId: "matriz-admin", relativePath: "src/dashboard.tsx", name: "dashboard.tsx", size: 1200, content: { kind: "text", value: "export const Dashboard = () => null" } }),
    openResource: vi.fn().mockResolvedValue(undefined),
    revealResource: vi.fn().mockResolvedValue(undefined),
    openResourceInEditor: vi.fn().mockResolvedValue(undefined),
    renameResource: vi.fn().mockResolvedValue(undefined),
    duplicateResource: vi.fn().mockResolvedValue(undefined),
    recycleResource: vi.fn().mockResolvedValue(undefined),
  } as unknown as DesktopGateway
}

describe("FileExplorer", () => {
  it("browses app-relative paths and renders a lightweight preview", async () => {
    const desktop = gateway()
    render(<FileExplorer gateway={desktop} runtimes={[runtime]} signal={vi.fn()} />)
    fireEvent.click(await screen.findByRole("button", { name: "Abrir pasta src" }))
    fireEvent.click(await screen.findByRole("button", { name: "Selecionar dashboard.tsx" }))
    expect(await screen.findByText("export const Dashboard = () => null")).toBeVisible()
    expect(desktop.previewFile).toHaveBeenCalledWith("matriz-admin", "src/dashboard.tsx")
  })

  it("requires a second click before moving a file to Recycle Bin", async () => {
    const desktop = gateway()
    render(<FileExplorer gateway={desktop} runtimes={[runtime]} signal={vi.fn()} />)
    fireEvent.click(await screen.findByRole("button", { name: "Abrir pasta src" }))
    fireEvent.click(await screen.findByRole("button", { name: "Selecionar dashboard.tsx" }))
    fireEvent.click(await screen.findByRole("button", { name: "Mover dashboard.tsx para a Lixeira" }))
    expect(desktop.recycleResource).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Confirmar mover dashboard.tsx para a Lixeira" }))
    await waitFor(() => expect(desktop.recycleResource).toHaveBeenCalledWith("matriz-admin", "src/dashboard.tsx"))
  })
})
