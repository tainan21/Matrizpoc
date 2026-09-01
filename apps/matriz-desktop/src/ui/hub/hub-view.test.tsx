import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import { HubView } from "./hub-view"

afterEach(cleanup)

function gateway(): DesktopGateway {
  return {
    systemPulse: vi.fn().mockResolvedValue({ cpuUsage: 18, cpuModel: "Test CPU", usedMemoryBytes: 8e9, totalMemoryBytes: 16e9, availableMemoryBytes: 8e9, uptimeSeconds: 3600, windowsVersion: "Windows 11", hostname: "MATRIZ", diskFreeBytes: 100e9, diskUsedBytes: 50e9, processCount: 120 }),
    getAwakeState: vi.fn().mockResolvedValue(false),
    setAwake: vi.fn().mockResolvedValue(true),
    scanNodeModules: vi.fn().mockResolvedValue({ scanId: "scan-1", potentialBytes: 42, candidates: [{ appId: "matriz-hub", projectName: "Matriz Hub", path: "C:\\apps\\matriz-hub\\node_modules", lastUsedAt: 1, packageManager: "pnpm", sizeBytes: 42 }] }),
    deleteNodeModules: vi.fn().mockResolvedValue({ recoveredBytes: 42, results: [{ appId: "matriz-hub", deleted: true, recoveredBytes: 42 }] }),
    readResumeSession: vi.fn().mockResolvedValue({ workspacePath: "C:\\workspace", lastUsedAt: {}, resume: { area: "apps", appId: "matriz-hub", terminalCwd: "C:\\workspace", updatedAt: 1 } }),
  } as unknown as DesktopGateway
}

describe("HubView", () => {
  it("isolates unavailable temperature while rendering the remaining pulse", async () => {
    render(<HubView gateway={gateway()} onResume={vi.fn()} />)
    expect(await screen.findByText("Test CPU")).toBeVisible()
    expect(screen.getByText("Unavailable")).toBeVisible()
    expect(screen.getByText("Windows 11")).toBeVisible()
  })

  it("requires selection and confirmation before deleting node_modules", async () => {
    const desktop = gateway()
    render(<HubView gateway={desktop} onResume={vi.fn()} />)
    fireEvent.click(await screen.findByRole("button", { name: "VERIFICAR AGORA" }))
    fireEvent.click(await screen.findByRole("checkbox", { name: /Matriz Hub/ }))
    fireEvent.click(screen.getByRole("button", { name: "LIMPAR SELECIONADOS" }))
    expect(desktop.deleteNodeModules).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "CONFIRMAR LIMPEZA" }))
    await waitFor(() => expect(desktop.deleteNodeModules).toHaveBeenCalledWith({ scanId: "scan-1", appIds: ["matriz-hub"] }))
  })

  it("toggles Awake explicitly and resumes without starting a terminal", async () => {
    const desktop = gateway()
    const onResume = vi.fn()
    render(<HubView gateway={desktop} onResume={onResume} />)
    fireEvent.click(await screen.findByRole("checkbox", { name: "Keep PC Awake" }))
    await waitFor(() => expect(desktop.setAwake).toHaveBeenCalledWith(true))
    fireEvent.click(await screen.findByRole("button", { name: "RETOMAR" }))
    expect(onResume).toHaveBeenCalledWith(expect.objectContaining({ area: "apps", appId: "matriz-hub" }))
  })
})
