import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../application/desktop-gateway"
import type { EnvironmentVariable } from "../domain/types"
import { ControlApp } from "./app"

afterEach(cleanup)
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} })
})

function gateway(): DesktopGateway {
  return {
    snapshot: vi.fn().mockResolvedValue({
      snapshotId: "observed",
      ports: [{ port: 3000, pid: 3210, processName: "next.exe", state: "ready" }],
    }),
    runtimeSnapshot: vi.fn().mockResolvedValue(([
      ["matriz-hub", "Matriz Hub", 3000], ["spot", "Spot", 3001],
      ["matriz-admin", "Matriz Admin", 3002], ["contracts", "Contracts", 3003],
      ["willdash", "Willdash", 3004], ["matriz-workbench", "Workbench", 3005],
      ["sites", "Sites", 3006], ["matrizlib", "MatrizLib", 3007], ["seumei", "Seumei", 3008],
    ] as const).map(([id, label, port]) => ({ id, label, port, status: "stopped" as const, ownership: "none" as const, endpoint: `http://localhost:${port}/`, health: "offline" as const }))),
    openRuntimeTarget: vi.fn().mockResolvedValue(undefined),
    restartRuntime: vi.fn().mockResolvedValue(undefined),
    stopRuntime: vi.fn().mockResolvedValue(undefined),
    openPreview: vi.fn().mockResolvedValue(undefined),
    setPreviewBounds: vi.fn().mockResolvedValue(undefined),
    navigatePreview: vi.fn().mockResolvedValue(undefined),
    previewBack: vi.fn().mockResolvedValue(undefined),
    previewForward: vi.fn().mockResolvedValue(undefined),
    reloadPreview: vi.fn().mockResolvedValue(undefined),
    closePreview: vi.fn().mockResolvedValue(undefined),
    activityHistory: vi.fn().mockResolvedValue([]),
    subscribeActivity: vi.fn().mockResolvedValue(undefined),
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
      workspacePath: "C:\\Apps\\matriz-infra-hub",
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
      operationId: "app.seumei.web",
      status: "starting",
      cwd: "C:\\Apps\\matriz-infra-hub",
      tail: "",
    }),
    getNativeAppRuntime: vi.fn().mockResolvedValue({ appId: "matriz-admin", state: "not-built" }),
    installNativeApp: vi.fn().mockResolvedValue({ appId: "matriz-admin", state: "installed", version: "0.1.0" }),
    startNativeApp: vi.fn().mockResolvedValue({ appId: "matriz-admin", state: "running", version: "0.1.0" }),
    stopNativeApp: vi.fn().mockResolvedValue({ appId: "matriz-admin", state: "installed", version: "0.1.0" }),
    listEnvironments: vi.fn().mockResolvedValue([
      { fileName: ".env.local", size: 20, modifiedAt: Date.now() },
    ]),
    readEnvironment: vi.fn().mockResolvedValue({
      appId: "matriz-admin",
      fileName: ".env.local",
      revision: "rev",
      missingRequired: [],
      variables: [],
    }),
    revealEnvironmentValue: vi.fn().mockResolvedValue("secret"),
    saveEnvironment: vi.fn().mockImplementation(async (request) => ({
      appId: request.appId,
      fileName: request.fileName,
      revision: "next-rev",
      missingRequired: [],
      variables: request.variables.map((variable: EnvironmentVariable) => ({
        ...variable,
        sensitive: false,
        source: request.fileName,
      })),
    })),
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

  it("serializes rapid preference writes without reverting an earlier patch", async () => {
    const desktop = gateway()
    const resolvers: Array<() => void> = []
    vi.mocked(desktop.writeSettings).mockImplementation((settings) => new Promise((resolve) => {
      resolvers.push(() => resolve(settings))
    }))
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")
    fireEvent.click(screen.getByRole("button", { name: "Ajustes" }))

    fireEvent.click(screen.getByRole("checkbox", { name: "Sons" }))
    fireEvent.change(screen.getByRole("slider", { name: "Volume" }), { target: { value: "0.65" } })

    await waitFor(() => expect(desktop.writeSettings).toHaveBeenCalledTimes(1))
    expect(desktop.writeSettings).toHaveBeenNthCalledWith(1, expect.objectContaining({ soundsEnabled: true, volume: 0.45 }))
    resolvers.shift()?.()
    await waitFor(() => expect(desktop.writeSettings).toHaveBeenCalledTimes(2))
    expect(desktop.writeSettings).toHaveBeenNthCalledWith(2, expect.objectContaining({ soundsEnabled: true, volume: 0.65 }))
  })

  it("starts Seumei Web in an observable terminal and keeps activity in the rail", async () => {
    const desktop = gateway()
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Apps" }))
    fireEvent.click(await screen.findByRole("button", { name: /Seumei.*3008/ }))
    fireEvent.click(await screen.findByRole("button", { name: "Iniciar Seumei" }))

    await waitFor(() =>
      expect(desktop.startManagedOperation).toHaveBeenCalledWith("app.seumei.web"),
    )
    expect(screen.getByRole("button", { name: "Terminal · 1 ativa" })).toBeVisible()
  })

  it("stops a ready app through its owned terminal session", async () => {
    const desktop = gateway()
    vi.mocked(desktop.appStatuses).mockResolvedValue([
      { id: "seumei", port: 3008, status: "ready", pid: 4321 },
    ])
    vi.mocked(desktop.runtimeSnapshot).mockResolvedValue([{
      id: "seumei", label: "Seumei", port: 3008, status: "ready", ownership: "managed",
      pid: 4321, sessionId: "managed-seumei", endpoint: "http://localhost:3008/", health: "healthy",
    }])
    vi.mocked(desktop.listTerminals).mockResolvedValue([
      {
        id: "managed-seumei",
        title: "SEUMEI / WEB",
        kind: "managed",
        operationId: "app.seumei.web",
        status: "running",
        cwd: "C:\\Apps\\matriz-infra-hub",
        tail: "",
      },
    ])
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Apps" }))
    fireEvent.click(await screen.findByRole("button", { name: "Parar Seumei" }))

    await waitFor(() => expect(desktop.stopRuntime).toHaveBeenCalledWith("seumei"))
    expect(desktop.stopApp).not.toHaveBeenCalled()
  })

  it("protects an externally occupied app port from Control actions", async () => {
    const desktop = gateway()
    vi.mocked(desktop.appStatuses).mockResolvedValue([
      { id: "contracts", port: 3003, status: "ready", pid: 9660 },
    ])
    vi.mocked(desktop.runtimeSnapshot).mockResolvedValue([{
      id: "contracts", label: "Contracts", port: 3003, status: "ready", ownership: "external",
      pid: 9660, endpoint: "http://localhost:3003/", health: "healthy",
    }])
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Apps" }))
    await screen.findByText(":3003 · EXTERNO")
    expect(screen.queryByRole("button", { name: "Parar Contracts" })).not.toBeInTheDocument()
    expect(screen.getByText(":3003 · EXTERNO")).toBeVisible()
    expect(desktop.stopApp).not.toHaveBeenCalled()
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

  it("switches Matriz Admin from Web to its native lifecycle", async () => {
    const desktop = gateway()
    vi.mocked(desktop.getNativeAppRuntime).mockResolvedValue({ appId: "matriz-admin", state: "built", version: "0.1.0" })
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Apps" }))
    fireEvent.click(await screen.findByRole("button", { name: "Matriz Admin Nativo" }))
    fireEvent.click(screen.getByRole("button", { name: "Instalar Matriz Admin nativo" }))

    await waitFor(() => expect(desktop.installNativeApp).toHaveBeenCalledOnce())
    expect(screen.getByText("INSTALLED")).toBeVisible()
  })

  it("stops a running Matriz Admin native process from the same compact action", async () => {
    const desktop = gateway()
    vi.mocked(desktop.getNativeAppRuntime).mockResolvedValue({ appId: "matriz-admin", state: "running", version: "0.1.0" })
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Apps" }))
    fireEvent.click(await screen.findByRole("button", { name: "Matriz Admin Nativo" }))
    fireEvent.click(screen.getByRole("button", { name: "Fechar Matriz Admin nativo" }))

    await waitFor(() => expect(desktop.stopNativeApp).toHaveBeenCalledOnce())
    expect(screen.getByText("INSTALLED")).toBeVisible()
  })

  it("surfaces native installer verification failures as operational feedback", async () => {
    const desktop = gateway()
    vi.mocked(desktop.getNativeAppRuntime).mockResolvedValue({ appId: "matriz-admin", state: "built", version: "0.1.0" })
    vi.mocked(desktop.installNativeApp).mockRejectedValue(new Error("Installer sem hash confiável"))
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Apps" }))
    fireEvent.click(await screen.findByRole("button", { name: "Matriz Admin Nativo" }))
    fireEvent.click(screen.getByRole("button", { name: "Instalar Matriz Admin nativo" }))

    expect(await screen.findByRole("status")).toHaveTextContent("Installer sem hash confiável")
  })

  it("opens a declared route in the single native preview surface", async () => {
    const desktop = gateway()
    vi.mocked(desktop.runtimeSnapshot).mockResolvedValue([{
      id: "matriz-admin", label: "Matriz Admin", port: 3002, status: "ready",
      ownership: "managed", pid: 30020, sessionId: "admin-web",
      endpoint: "http://localhost:3002/", health: "healthy",
    }])
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Apps" }))
    fireEvent.click(await screen.findByRole("button", { name: "Abrir rota… Matriz Admin" }))
    fireEvent.click(screen.getByRole("button", { name: /\/establishments.*Estabelecimentos/ }))
    fireEvent.click(screen.getByRole("button", { name: "Preview Matriz Admin" }))

    await waitFor(() => expect(desktop.openPreview).toHaveBeenCalledWith(
      { appId: "matriz-admin", routePath: "/establishments" },
      expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }),
    ))
  })
})
