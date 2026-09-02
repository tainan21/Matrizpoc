import "@testing-library/jest-dom/vitest"

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
    gitSnapshot: vi.fn().mockResolvedValue({ revision: "rev", branch: "main", ahead: 0, behind: 0, changes: [], recent: [], branches: [], reflog: [] }),
    gitDiff: vi.fn().mockResolvedValue({ changeId: "change", staged: false, lines: [], truncated: false }),
    gitStage: vi.fn().mockResolvedValue({ revision: "rev", branch: "main", ahead: 0, behind: 0, changes: [], recent: [], branches: [], reflog: [] }),
    gitUnstage: vi.fn().mockResolvedValue({ revision: "rev", branch: "main", ahead: 0, behind: 0, changes: [], recent: [], branches: [], reflog: [] }),
    gitCommit: vi.fn().mockResolvedValue({ revision: "rev", branch: "main", ahead: 0, behind: 0, changes: [], recent: [], branches: [], reflog: [] }),
    gitRemote: vi.fn().mockResolvedValue({ revision: "rev", branch: "main", ahead: 0, behind: 0, changes: [], recent: [], branches: [], reflog: [] }),
    systemPulse: vi.fn().mockResolvedValue({ cpuUsage: 0, cpuModel: "Test CPU", usedMemoryBytes: 0, totalMemoryBytes: 1, availableMemoryBytes: 1, uptimeSeconds: 0, windowsVersion: "Windows", processCount: 0 }),
    getAwakeState: vi.fn().mockResolvedValue(false),
    setAwake: vi.fn().mockImplementation(async (enabled) => enabled),
    scanNodeModules: vi.fn().mockResolvedValue({ scanId: "scan", candidates: [], potentialBytes: 0 }),
    deleteNodeModules: vi.fn().mockResolvedValue({ results: [], recoveredBytes: 0 }),
    readResumeSession: vi.fn().mockResolvedValue({ workspacePath: "C:\\Apps\\matriz-infra-hub", lastUsedAt: {} }),
    recordSessionContext: vi.fn().mockResolvedValue({ workspacePath: "C:\\Apps\\matriz-infra-hub", lastUsedAt: {} }),
    readSettings: vi.fn().mockResolvedValue({
      theme: "matriz",
      closeToTray: true,
      soundsEnabled: false,
      volume: 0.45,
      startWithWindows: false,
      terminalDockOpen: false,
      terminalDockHeight: 280,
      workspacePath: "C:\\Apps\\matriz-infra-hub",
    }),
    writeSettings: vi.fn().mockImplementation(async (settings) => settings),
    checkUpdate: vi.fn().mockResolvedValue({ state: "current", currentVersion: "1.0.0" }),
    downloadUpdate: vi.fn().mockResolvedValue({ state: "downloaded", currentVersion: "1.0.0", version: "1.1.0" }),
    installUpdate: vi.fn().mockResolvedValue(undefined),
    infrastructureSnapshot: vi.fn().mockResolvedValue({ revision: "infra", root: "C:\\Infra", services: [] }),
    previewInfrastructureAction: vi.fn().mockRejectedValue(new Error("not used")),
    confirmInfrastructureAction: vi.fn().mockRejectedValue(new Error("not used")),
    infrastructureLogs: vi.fn().mockResolvedValue([]),
    infrastructureMigrations: vi.fn().mockResolvedValue({ state: "clean", schemas: [] }),
    previewInfrastructureMigrations: vi.fn().mockRejectedValue(new Error("not used")),
    confirmInfrastructureMigrations: vi.fn().mockRejectedValue(new Error("not used")),
    previewInfrastructureSeed: vi.fn().mockRejectedValue(new Error("not used")),
    confirmInfrastructureSeed: vi.fn().mockRejectedValue(new Error("not used")),
    infrastructureBackups: vi.fn().mockResolvedValue([]),
    hide: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    terminalReadiness: vi.fn().mockResolvedValue({
      ready: true,
      workspacePath: "C:\\Apps\\matriz-infra-hub",
      shellPath: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      shellLabel: "Windows PowerShell",
      conptyAvailable: true,
      sessionCount: 0,
      sessionLimit: 6,
    }),
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
    compareEnvironments: vi.fn().mockResolvedValue({ appId: "matriz-admin", sourceFile: ".env.local", targetFile: ".env.example", targetRevision: "target", entries: [] }),
    promoteEnvironment: vi.fn().mockResolvedValue({ appId: "matriz-admin", fileName: ".env.example", revision: "next", missingRequired: [], variables: [] }),
    findEnvironmentReferences: vi.fn().mockResolvedValue({ appId: "matriz-admin", key: "PORT", scannedFiles: 0, truncated: false, matches: [] }),
    listDirectory: vi.fn().mockResolvedValue({ appId: "matriz-admin", relativePath: "", entries: [] }),
    previewFile: vi.fn().mockResolvedValue({ appId: "matriz-admin", relativePath: "README.md", name: "README.md", size: 0, content: { kind: "text", value: "" } }),
    openResource: vi.fn().mockResolvedValue(undefined),
    revealResource: vi.fn().mockResolvedValue(undefined),
    openResourceInEditor: vi.fn().mockResolvedValue(undefined),
    renameResource: vi.fn().mockResolvedValue(undefined),
    duplicateResource: vi.fn().mockResolvedValue(undefined),
    recycleResource: vi.fn().mockResolvedValue(undefined),
    commerceSnapshot: vi.fn().mockResolvedValue({ wallet: { balance: 1250, currency: "M", transactions: [] }, packages: [] }),
    acquirePackage: vi.fn().mockResolvedValue({ wallet: { balance: 1000, currency: "M", transactions: [] }, packages: [] }),
    installPackage: vi.fn().mockResolvedValue({ wallet: { balance: 1000, currency: "M", transactions: [] }, packages: [] }),
    uninstallPackage: vi.fn().mockResolvedValue({ wallet: { balance: 1000, currency: "M", transactions: [] }, packages: [] }),
    repairPackage: vi.fn().mockResolvedValue({ wallet: { balance: 1000, currency: "M", transactions: [] }, packages: [] }),
    activatePackage: vi.fn().mockResolvedValue({ packageId: "matriz.components", appId: "matrizlib", operationId: "app.matrizlib.web", routePath: "/" }),
    recoverRuntime: vi.fn().mockResolvedValue({ appId: "matriz-admin", status: "ready" }),
    runbookCatalog: vi.fn().mockResolvedValue([]),
    runRunbook: vi.fn().mockResolvedValue({ runbookId: "validate-environment", appId: "matriz-admin", status: "completed", steps: [] }),
  }
}

describe("Matriz Control", () => {
  it("kills the exact observed process in one action", async () => {
    const desktop = gateway()
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)

    expect(await screen.findByText("3000")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Portas" }))
    fireEvent.click(screen.getByRole("button", { name: "Encerrar PID 3210" }))

    await waitFor(() =>
      expect(desktop.kill).toHaveBeenCalledWith({ pid: 3210, snapshotId: "observed" }),
    )
  })

  it("keeps every approved primary mode keyboard reachable in product order", async () => {
    render(<ControlApp gateway={gateway()} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")
    expect(within(screen.getByRole("navigation", { name: "Modos" })).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Início", "Portas", "Apps", "Workspace", "Hub", "Agentes", "Ambientes", "Infra", "Git", "Terminal", "Ações", "Store", "Doctor", "Ajustes",
    ])
    expect(screen.getByRole("heading", { name: "INÍCIO" })).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Hub" }))
    expect(screen.getByRole("heading", { name: "MATRIZ HUB" })).toBeVisible()
  })

  it("keeps a global collapsed terminal bar without creating a shell automatically", async () => {
    const desktop = gateway()
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Abrir terminal inferior" }))

    expect(screen.getByRole("button", { name: "Recolher terminal inferior" })).toBeVisible()
    expect(screen.getByRole("separator", { name: "Redimensionar terminal inferior" })).toBeVisible()
    expect(desktop.createTerminal).not.toHaveBeenCalled()
    await waitFor(() => expect(desktop.writeSettings).toHaveBeenCalledWith(expect.objectContaining({ terminalDockOpen: true })))
  })

  it("restores the persisted terminal dock without creating a shell", async () => {
    const desktop = gateway()
    vi.mocked(desktop.readSettings).mockResolvedValue({
      theme: "matriz",
      closeToTray: true,
      soundsEnabled: false,
      volume: 0.45,
      startWithWindows: false,
      terminalDockOpen: true,
      terminalDockHeight: 360,
      workspacePath: "C:\\Apps\\matriz-infra-hub",
    })
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)

    expect(await screen.findByRole("button", { name: "Recolher terminal inferior" })).toBeVisible()
    expect(screen.getByRole("separator", { name: "Redimensionar terminal inferior" })).toHaveAttribute("aria-valuenow", "360")
    expect(desktop.createTerminal).not.toHaveBeenCalled()
  })

  it("revalidates a blocked terminal after workspace setup without creating a session", async () => {
    const desktop = gateway()
    vi.mocked(desktop.readSettings).mockResolvedValue({
      theme: "matriz",
      closeToTray: true,
      soundsEnabled: false,
      volume: 0.45,
      startWithWindows: false,
      terminalDockOpen: false,
      terminalDockHeight: 280,
    })
    vi.mocked(desktop.terminalReadiness)
      .mockResolvedValueOnce({
        ready: false,
        conptyAvailable: true,
        sessionCount: 0,
        sessionLimit: 6,
        reason: "Workspace Matriz ainda não foi selecionado.",
      })
      .mockResolvedValue({
        ready: true,
        workspacePath: "C:\\Apps\\matriz-infra-hub",
        shellPath: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        shellLabel: "Windows PowerShell",
        conptyAvailable: true,
        sessionCount: 0,
        sessionLimit: 6,
      })

    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Terminal" }))
    expect(await screen.findByText("Selecione o workspace Matriz para abrir o PowerShell.")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Configurar workspace" }))
    expect(screen.getByRole("heading", { name: "AJUSTES" })).toBeVisible()

    fireEvent.change(screen.getByRole("textbox", { name: "Workspace" }), {
      target: { value: "C:\\Apps\\matriz-infra-hub" },
    })
    fireEvent.click(screen.getByRole("button", { name: "USAR" }))

    await waitFor(() => expect(desktop.terminalReadiness).toHaveBeenCalledTimes(2))
    expect(desktop.createTerminal).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Terminal" }))
    fireEvent.click(await screen.findByRole("button", { name: "Nova sessão PowerShell" }))
    await waitFor(() => expect(desktop.createTerminal).toHaveBeenCalledTimes(1))
  })

  it("keeps Início operable when one status source is unavailable", async () => {
    const desktop = gateway()
    vi.mocked(desktop.runtimeSnapshot).mockRejectedValue(new Error("runtime offline"))
    vi.mocked(desktop.workspacePulse).mockResolvedValue({ branch: "main", changedFiles: 2, clean: false })
    vi.mocked(desktop.doctor).mockResolvedValue([{
      id: "git",
      group: "Toolchain",
      label: "Git",
      ok: true,
      severity: "success",
      value: "git version 2.51.0",
      description: "Ferramenta de versionamento.",
      expected: "Major 2",
    }])
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)

    expect(await screen.findByRole("heading", { name: "INÍCIO" })).toBeVisible()
    expect(await screen.findByText("main")).toBeVisible()
    expect(screen.getByText("Apps indisponíveis")).toBeVisible()
    expect(screen.getByText("1/1 checks prontos")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Abrir Git" }))
    expect(screen.getByRole("heading", { name: "GIT" })).toBeVisible()
  })

  it("blocks workspace and primary navigation while an environment draft is dirty", async () => {
    const desktop = gateway()
    const feedback = { play: vi.fn() }
    vi.mocked(desktop.readEnvironment).mockResolvedValue({
      appId: "matriz-admin",
      fileName: ".env.local",
      revision: "rev",
      missingRequired: [],
      variables: [{ key: "PORT", value: "3002", sensitive: false, source: ".env.local" }],
    })
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    render(<ControlApp gateway={desktop} feedback={feedback} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Workspace" }))
    fireEvent.change(await screen.findByLabelText("Valor PORT"), { target: { value: "3999" } })
    fireEvent.click(screen.getByRole("button", { name: "ARQUIVOS & ATIVOS" }))
    expect(screen.getByRole("heading", { name: ".ENV MANAGER" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Apps" }))

    expect(screen.getByRole("heading", { name: ".ENV MANAGER" })).toBeVisible()
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    const deck = screen.getByRole("combobox", { name: "Buscar ações" })
    fireEvent.change(deck, { target: { value: "Nova sessão PowerShell" } })
    fireEvent.keyDown(deck, { key: "Enter" })

    expect(desktop.createTerminal).not.toHaveBeenCalled()
    expect(screen.getByRole("heading", { name: ".ENV MANAGER" })).toBeVisible()
    expect(confirm).toHaveBeenCalledTimes(3)
    expect(feedback.play).toHaveBeenCalledWith("warning")
    confirm.mockRestore()
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

  it("promotes the existing environment authority as a direct primary area", async () => {
    const desktop = gateway()
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")

    fireEvent.click(screen.getByRole("button", { name: "Ambientes" }))

    expect(await screen.findByRole("heading", { name: ".ENV MANAGER" })).toBeVisible()
    expect(screen.queryByRole("navigation", { name: "Recursos do workspace" })).not.toBeInTheDocument()
  })

  it("offers every operational theme and applies the selected theme immediately", async () => {
    const desktop = gateway()
    render(<ControlApp gateway={desktop} feedback={{ play: vi.fn() }} />)
    await screen.findByText("3000")
    fireEvent.click(screen.getByRole("button", { name: "Ajustes" }))

    expect(screen.getByRole("button", { name: "Matriz" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Reator Ácido" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Aurora Líquida" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Brasa Industrial" })).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Aurora Líquida" }))
    await waitFor(() => expect(desktop.writeSettings).toHaveBeenCalledWith(expect.objectContaining({ theme: "aurora-liquid" })))
    expect(document.querySelector(".control-shell")).toHaveAttribute("data-theme", "aurora-liquid")
  })

  it("initializes audio once while reconfiguring persisted preferences", async () => {
    const desktop = gateway()
    const feedback = { play: vi.fn(), configure: vi.fn(), initialize: vi.fn() }
    render(<ControlApp gateway={desktop} feedback={feedback} />)
    await screen.findByText("3000")
    await waitFor(() => expect(feedback.initialize).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole("button", { name: "Ajustes" }))
    fireEvent.click(screen.getByRole("button", { name: "Brasa Industrial" }))

    await waitFor(() => expect(feedback.configure).toHaveBeenLastCalledWith(expect.objectContaining({ theme: "industrial-ember" })))
    expect(feedback.initialize).toHaveBeenCalledTimes(1)
  })

  it("never lets an audio failure block navigation", async () => {
    render(<ControlApp gateway={gateway()} feedback={{ play: () => { throw new Error("audio device unavailable") } }} />)
    await screen.findByText("3000")

    expect(() => fireEvent.click(screen.getByRole("button", { name: "Apps" }))).not.toThrow()
    expect(await screen.findByRole("heading", { name: "APPS" })).toBeVisible()
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
    fireEvent.click(await screen.findByRole("button", { name: /\/establishments.*Estabelecimentos/ }))
    fireEvent.click(screen.getByRole("button", { name: "Preview Matriz Admin" }))

    await waitFor(() => expect(desktop.openPreview).toHaveBeenCalledWith(
      { appId: "matriz-admin", routePath: "/establishments" },
      expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }),
    ))
  })
})
