import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../application/desktop-gateway"
import { ControlApp } from "./app"

afterEach(cleanup)
beforeAll(() => vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null))

function gateway(): DesktopGateway {
  return {
    snapshot: vi.fn().mockResolvedValue({
      snapshotId: "observed",
      ports: [{ port: 3000, pid: 3210, processName: "next.exe", state: "ready" }],
    }),
    kill: vi.fn().mockResolvedValue({ snapshotId: "next", ports: [] }),
    killMany: vi.fn().mockResolvedValue({ snapshotId: "next", ports: [] }),
    startApp: vi.fn().mockResolvedValue(undefined),
    stopApp: vi.fn().mockResolvedValue(undefined),
    appStatuses: vi.fn().mockResolvedValue([]),
    runGate: vi.fn().mockResolvedValue({
      gateId: "lint",
      success: true,
      durationMs: 1,
      output: [],
    }),
    openTarget: vi.fn().mockResolvedValue(undefined),
    selectWorkspace: vi.fn().mockResolvedValue("C:\\Apps\\matriz-infra-hub"),
    doctor: vi.fn().mockResolvedValue([]),
    workspacePulse: vi.fn().mockResolvedValue({ branch: "main", changedFiles: 0, clean: true }),
    readSettings: vi.fn().mockResolvedValue({
      closeToTray: true,
      soundsEnabled: false,
      volume: 0.45,
      startWithWindows: false,
    }),
    writeSettings: vi.fn().mockImplementation(async (settings) => settings),
    hide: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    createTerminal: vi.fn().mockResolvedValue({
      id: "shell-1",
      title: "PowerShell",
      kind: "shell",
      status: "running",
      cwd: "C:\\Apps\\matriz-infra-hub",
      tail: "",
    }),
    writeTerminal: vi.fn().mockResolvedValue(undefined),
    resizeTerminal: vi.fn().mockResolvedValue(undefined),
    interruptTerminal: vi.fn().mockResolvedValue(undefined),
    closeTerminal: vi.fn().mockResolvedValue(undefined),
    listTerminals: vi.fn().mockResolvedValue([]),
    subscribeTerminal: vi.fn().mockResolvedValue(undefined),
    startManagedOperation: vi.fn().mockResolvedValue({
      id: "managed-1",
      title: "SEUMEI / WEB",
      kind: "managed",
      status: "starting",
      cwd: "C:\\Apps\\matriz-infra-hub",
      tail: "",
    }),
    getNativeAppRuntime: vi.fn().mockResolvedValue({ appId: "seumei", state: "not-built" }),
    installNativeApp: vi.fn().mockResolvedValue({ appId: "seumei", state: "installed", version: "0.1.0" }),
    startNativeApp: vi.fn().mockResolvedValue({ appId: "seumei", state: "running", version: "0.1.0" }),
  }
}

describe("Matriz Control", () => {
  it("kills the exact observed process in one action", async () => {
    const desktop = gateway()
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)

    expect(await screen.findByText("3000")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Encerrar PID 3210" }))

    await waitFor(() =>
      expect(desktop.kill).toHaveBeenCalledWith({ pid: 3210, snapshotId: "observed" }),
    )
  })

  it("keeps all primary modes keyboard reachable", async () => {
    render(<ControlApp gateway={gateway()} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")
    for (const label of ["Portas", "Apps", "Terminal", "Ações", "Doctor", "Ajustes"]) {
      expect(screen.getByRole("button", { name: label })).toBeVisible()
    }
  })

  it("starts Seumei Web in an observable terminal and keeps activity in the rail", async () => {
    const desktop = gateway()
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Apps" }))
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar Seumei" }))

    await waitFor(() =>
      expect(desktop.startManagedOperation).toHaveBeenCalledWith("app.seumei.web"),
    )
    expect(screen.getByRole("button", { name: "Terminal · 1 ativa" })).toBeVisible()
  })

  it("opens the global command deck and executes only the observed PID", async () => {
    const desktop = gateway()
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    const search = screen.getByRole("combobox", { name: "Buscar ações" })
    fireEvent.change(search, { target: { value: "encerrar 3210" } })
    fireEvent.keyDown(search, { key: "Enter" })
    expect(screen.getByText("ENTER NOVAMENTE")).toBeVisible()
    fireEvent.keyDown(search, { key: "Enter" })

    await waitFor(() =>
      expect(desktop.kill).toHaveBeenCalledWith({ pid: 3210, snapshotId: "observed" }),
    )
  })

  it("switches Seumei from Web to its native lifecycle", async () => {
    const desktop = gateway()
    vi.mocked(desktop.getNativeAppRuntime).mockResolvedValue({ appId: "seumei", state: "built", version: "0.1.0" })
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Apps" }))
    fireEvent.click(await screen.findByRole("button", { name: "Seumei Nativo" }))
    fireEvent.click(screen.getByRole("button", { name: "Instalar Seumei nativo" }))

    await waitFor(() => expect(desktop.installNativeApp).toHaveBeenCalledOnce())
    expect(screen.getByText("INSTALLED")).toBeVisible()
  })
})
