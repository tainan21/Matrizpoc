import { Badge, Button, Input } from "@matriz/design-ui/primitives"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { GATES, MATRIZ_DESKTOP_APPS, QUICK_TARGETS } from "../application/catalog"
import type { DeckCommand } from "../application/command-deck"
import type { DesktopGateway } from "../application/desktop-gateway"
import type {
  AppRuntime,
  DesktopSettings,
  DesktopAppId,
  DoctorCheck,
  GateId,
  ManagedOperationId,
  NativeAppRuntime,
  RuntimeInstance,
  TerminalSession,
  WorkspacePulse,
  HubArea,
  HubFeatureId,
} from "../domain/types"
import { Icons } from "./icons"
import { CommandDeck } from "./command-deck/command-deck"
import { DoctorView } from "./doctor/doctor-view"
import { FpsIndicator } from "./hub/fps-indicator"
import { HubView } from "./hub/hub-view"
import { HomeView, type HomeTarget } from "./home/home-view"
import { filterPorts, presentPorts } from "./presenters"
import { useDesktop } from "./use-desktop"
import { TerminalPane } from "./terminal/terminal-pane"
import { TerminalDock, clampTerminalDockHeight } from "./terminal/terminal-dock"
import { TerminalView } from "./terminal/terminal-view"
import { useTerminalRuntime } from "./terminal/use-terminal-runtime"
import { RuntimeWorkspace } from "./runtime/runtime-workspace"
import { RunbookPanel } from "./runbooks/runbook-panel"
import { WorkspaceView } from "./workspace/workspace-view"
import { StoreView } from "./store/store-view"
import { requestWorkspaceNavigation } from "./workspace/navigation-guard"
import { applyControlTheme } from "./theme/control-theme"
import { ThemePicker } from "./theme/theme-picker"

type View = "home" | "ports" | "apps" | "workspace" | "hub" | "agents" | "environments" | "infra" | "git" | "terminal" | "actions" | "store" | "doctor" | "settings"
type SoundId =
  | "system.start"
  | "system.end"
  | "interaction"
  | "navigation"
  | "success"
  | "warning"
  | "error"

export interface Feedback {
  play(id: SoundId): unknown
  configure?(settings: DesktopSettings): void
  initialize?(): void
}

type ExecuteAction = <T>(action: () => Promise<T>, success: string) => Promise<T>

function ignoreFeedbackFailure(action: () => unknown): void {
  try {
    const result = action()
    if (result instanceof Promise) void result.catch(() => undefined)
  } catch {
    // Audio feedback is optional and must never block product behavior.
  }
}

const VIEWS: readonly { id: View; label: string; icon: keyof typeof Icons }[] = [
  { id: "home", label: "Início", icon: "home" },
  { id: "ports", label: "Portas", icon: "ports" },
  { id: "apps", label: "Apps", icon: "apps" },
  { id: "workspace", label: "Workspace", icon: "workspace" },
  { id: "hub", label: "Hub", icon: "hub" },
  { id: "agents", label: "Agentes", icon: "agents" },
  { id: "environments", label: "Ambientes", icon: "environments" },
  { id: "infra", label: "Infra", icon: "infra" },
  { id: "git", label: "Git", icon: "git" },
  { id: "terminal", label: "Terminal", icon: "terminal" },
  { id: "actions", label: "Ações", icon: "actions" },
  { id: "store", label: "Store", icon: "store" },
  { id: "doctor", label: "Doctor", icon: "doctor" },
  { id: "settings", label: "Ajustes", icon: "settings" },
]

export function ControlApp({ gateway, feedback, initialTheme = "matriz" }: { gateway: DesktopGateway; feedback: Feedback; initialTheme?: DesktopSettings["theme"] }) {
  const safeFeedback = useMemo<Feedback>(() => ({
    play: (id) => ignoreFeedbackFailure(() => feedback.play(id)),
    configure: feedback.configure ? (settings) => ignoreFeedbackFailure(() => feedback.configure?.(settings)) : undefined,
    initialize: feedback.initialize ? () => ignoreFeedbackFailure(() => feedback.initialize?.()) : undefined,
  }), [feedback])
  const desktop = useDesktop(gateway)
  const settingsSnapshot = useRef<DesktopSettings | undefined>(undefined)
  const settingsWrites = useRef<Promise<void>>(Promise.resolve())
  const persistSettings = useRef<((patch: Partial<DesktopSettings>) => void) | undefined>(undefined)
  const terminal = useTerminalRuntime(gateway, (open) => {
    persistSettings.current?.({ terminalDockOpen: open })
  })
  const feedbackInitialized = useRef(false)
  const [view, setView] = useState<View>("home")
  const [query, setQuery] = useState("")
  const [confirmAll, setConfirmAll] = useState(false)
  const [runtimes, setRuntimes] = useState<readonly import("../domain/types").RuntimeInstance[]>([])
  const apps = useMemo<readonly AppRuntime[]>(() => runtimes.map(({ id, port, status, pid }) => ({ id, port, status, pid })), [runtimes])
  const [checks, setChecks] = useState<readonly DoctorCheck[]>([])
  const [pulse, setPulse] = useState<WorkspacePulse>()
  const [activeGate, setActiveGate] = useState<GateId>()
  const [workspacePath, setWorkspacePath] = useState("")
  const [hubFeature, setHubFeature] = useState<HubFeatureId>()
  const [activeAppId, setActiveAppId] = useState<DesktopAppId>()
  const [terminalDockHeight, setTerminalDockHeight] = useState(280)

  const ports = useMemo(
    () => filterPorts(presentPorts(desktop.snapshot.ports), query),
    [desktop.snapshot.ports, query],
  )

  const deckCommands = useMemo<readonly DeckCommand[]>(() => [
    { id: "terminal:new", label: "Nova sessão PowerShell", keywords: ["terminal", "console", "shell"], group: "Terminal", status: `${terminal.state.sessions.length}/6` },
    ...MATRIZ_DESKTOP_APPS.map((app) => ({ id: `app:${app.id}`, label: `Iniciar ${app.label}`, keywords: ["app", "web", `${app.port}`], group: "Apps" as const, status: apps.find(({ id }) => id === app.id)?.status ?? "pronto" })),
    ...GATES.map((gate) => ({ id: `gate:${gate.id}`, label: `Rodar ${gate.label}`, keywords: ["gate", "validar", "check"], group: "Gates" as const, status: "terminal" })),
    ...QUICK_TARGETS.map((target) => ({ id: `target:${target.id}`, label: `Abrir ${target.label}`, keywords: ["abrir", "jump", "atalho"], group: "Ações" as const })),
    ...ports.map((process) => ({ id: `kill:${process.pid}`, label: `Encerrar ${process.processName}`, keywords: ["kill", "porta", `${process.port}`, `${process.pid}`], group: "Portas" as const, status: `:${process.port} · PID ${process.pid}`, destructive: true })),
  ], [apps, ports, terminal.state.sessions.length])

  useEffect(() => {
    if (!desktop.settings) return
    settingsSnapshot.current = desktop.settings
    setWorkspacePath(desktop.settings.workspacePath ?? "")
    setTerminalDockHeight(clampTerminalDockHeight(desktop.settings.terminalDockHeight))
    terminal.restoreDockOpen(desktop.settings.terminalDockOpen)
    applyControlTheme(desktop.settings.theme)
    safeFeedback.configure?.(desktop.settings)
    if (!feedbackInitialized.current) {
      feedbackInitialized.current = true
      safeFeedback.initialize?.()
    }
  }, [desktop.settings, safeFeedback, terminal.restoreDockOpen])

  useEffect(() => {
    let refreshInterval: number | undefined
    if (view === "apps" || view === "workspace" || view === "environments" || view === "agents" || view === "infra" || view === "actions") {
      const refreshApps = () => void gateway.runtimeSnapshot().then(setRuntimes).catch(() => setRuntimes([]))
      refreshApps()
      refreshInterval = window.setInterval(refreshApps, 1_000)
    }
    if (view === "doctor") void gateway.doctor().then(setChecks).catch(() => setChecks([]))
    if (view === "actions" || view === "git") void gateway.workspacePulse().then(setPulse).catch(() => setPulse(undefined))
    return () => { if (refreshInterval !== undefined) window.clearInterval(refreshInterval) }
  }, [gateway, view])

  const recordContext = useCallback((area: HubArea, appId = activeAppId) => {
    if (!gateway.recordSessionContext) return
    const activeTerminal = terminal.state.sessions.find(({ id }) => id === terminal.state.activeId)
    void gateway.recordSessionContext({ area, appId, terminalCwd: activeTerminal?.cwd }).catch(() => undefined)
  }, [activeAppId, gateway, terminal.state.activeId, terminal.state.sessions])

  const chooseView = (next: View) => {
    if (next === view) return
    if (!requestWorkspaceNavigation()) {
      void safeFeedback.play("warning")
      return
    }
    setView(next)
    if (next !== "hub" && next !== "store") recordContext(next)
    void safeFeedback.play("navigation")
  }

  const openRuntimeTerminal = useCallback(() => setView("terminal"), [])
  const runtimeSignal = useCallback((kind: "navigation" | "success" | "error") => { void safeFeedback.play(kind) }, [safeFeedback])

  const createTerminal = async () => {
    try {
      await desktop.execute(terminal.create, "Terminal iniciado")
      void safeFeedback.play("success")
    } catch {
      void safeFeedback.play("error")
    }
  }

  const kill = async (pid: number) => {
    try {
      const snapshot = await desktop.execute(
        () => gateway.kill({ pid, snapshotId: desktop.snapshot.snapshotId }),
        `PID ${pid} encerrado`,
      )
      if (snapshot) desktop.setSnapshot(snapshot)
      void safeFeedback.play("success")
    } catch {
      void safeFeedback.play("error")
    }
  }

  const killAll = async () => {
    if (!confirmAll) {
      setConfirmAll(true)
      window.setTimeout(() => setConfirmAll(false), 3_000)
      return
    }
    const pids = [...new Set(ports.map(({ pid }) => pid))]
    if (!pids.length) return
    try {
      const snapshot = await desktop.execute(
        () => gateway.killMany({ pids, snapshotId: desktop.snapshot.snapshotId }),
        `${pids.length} processos encerrados`,
      )
      if (snapshot) desktop.setSnapshot(snapshot)
      setConfirmAll(false)
      void safeFeedback.play("success")
    } catch {
      void safeFeedback.play("error")
    }
  }

  const saveSettings = async (patch: Partial<DesktopSettings>, audible = true) => {
    if (!desktop.settings) return
    const previous = settingsSnapshot.current ?? desktop.settings
    const next = { ...previous, ...patch }
    settingsSnapshot.current = next
    desktop.setSettings(next)
    const write = settingsWrites.current.then(async () => {
      const saved = await gateway.writeSettings(next)
      if (settingsSnapshot.current === next) {
        settingsSnapshot.current = saved
        desktop.setSettings(saved)
        safeFeedback.configure?.(saved)
      }
    })
    settingsWrites.current = write.catch(() => undefined)
    try {
      await write
      if (audible) void safeFeedback.play("interaction")
    } catch {
      if (settingsSnapshot.current === next) {
        settingsSnapshot.current = previous
        desktop.setSettings(previous)
      }
      void safeFeedback.play("error")
    }
  }
  persistSettings.current = (patch) => { void saveSettings(patch, false) }

  const commitTerminalDockHeight = useCallback((height: number) => {
    const next = clampTerminalDockHeight(height)
    setTerminalDockHeight(next)
    persistSettings.current?.({ terminalDockHeight: next })
  }, [])

  const executeDeck = async (id: string) => {
    if (id === "terminal:new") {
      if (!requestWorkspaceNavigation()) return
      await createTerminal()
      setView("terminal")
    } else {
      const app = MATRIZ_DESKTOP_APPS.find((item) => id === `app:${item.id}`)
      const gate = GATES.find((item) => id === `gate:${item.id}`)
      const target = QUICK_TARGETS.find((item) => id === `target:${item.id}`)
      const process = ports.find((item) => id === `kill:${item.pid}`)
      if (app) await terminal.startOperation(`app.${app.id}.web`)
      else if (gate) await terminal.startOperation(`gate.${gate.id}`)
      else if (target) await gateway.openTarget(target.id)
      else if (process) await kill(process.pid)
      else throw new Error("Ação não disponível")
    }
    void safeFeedback.play("interaction")
  }

  return (
    <div className={`control-shell${view !== "terminal" ? " has-terminal-dock" : ""}`} data-matrizlib="0.1.0" data-theme={desktop.settings?.theme ?? initialTheme}>
      <header className="titlebar" data-tauri-drag-region>
        <span className="mark" aria-hidden="true">M</span>
        <strong data-tauri-drag-region>MATRIZ / CONTROL</strong>
        <span className="live-count" title="Listeners ativos">{desktop.snapshot.ports.length.toString().padStart(2, "0")}</span>
        <FpsIndicator />
        <button className="window-action" aria-label="Atualizar" onClick={() => void desktop.refresh()}><Icons.refresh /></button>
        <button className="window-action" aria-label="Ocultar" onClick={() => void gateway.hide()}><Icons.close /></button>
      </header>

      <nav className="mode-rail" aria-label="Modos">
        {VIEWS.map((item) => {
          const ViewIcon = Icons[item.icon]
          const terminalCount = item.id === "terminal" ? terminal.state.sessions.length : 0
          const label = terminalCount
            ? `Terminal · ${terminalCount} ${terminalCount === 1 ? "ativa" : "ativas"}`
            : item.label
          return <button key={item.id} title={item.label} aria-label={label} aria-current={view === item.id ? "page" : undefined} onClick={() => chooseView(item.id)}><ViewIcon /><span>{item.label}</span>{terminalCount ? <i className="mode-activity" aria-hidden="true">{terminalCount}</i> : null}</button>
        })}
      </nav>

      <main className="control-main">
        {view === "home" ? <HomeView gateway={gateway} ports={desktop.snapshot.ports} open={(target: HomeTarget) => chooseView(target)} /> : null}
        {view === "ports" ? (
          <section aria-labelledby="ports-title">
            <div className="section-head"><div><span className="eyebrow">P0 / LIVE</span><h1 id="ports-title">PORTAS</h1></div><Badge tone={ports.length ? "success" : "neutral"}>{ports.length} ON</Badge></div>
            <div className="port-tools"><Input aria-label="Buscar portas" placeholder="porta · pid · processo" value={query} onChange={(event) => setQuery(event.target.value)} /><Button variant={confirmAll ? "primary" : "secondary"} className="danger-button" disabled={!ports.length || desktop.busy} onClick={() => void killAll()}>{confirmAll ? "CONFIRMAR" : "KILL ALL"}</Button></div>
            <div className="port-list" role="list">
              {ports.map((process) => <div className="port-row" role="listitem" key={`${process.port}-${process.pid}`}><span className={`status-dot ${process.state}`} /><strong>{process.port}</strong><span className="process"><b>{process.processName}</b><small>PID {process.pid}</small></span><button className="kill-action" aria-label={`Encerrar PID ${process.pid}`} onClick={() => void kill(process.pid)} disabled={desktop.busy}><Icons.kill /></button></div>)}
              {!ports.length ? <div className="zero-state"><span>00</span><b>LIVRE</b></div> : null}
            </div>
          </section>
        ) : null}

        {view === "apps" ? <RuntimeWorkspace gateway={gateway} runtimes={runtimes} refresh={() => gateway.runtimeSnapshot().then(setRuntimes)} startOperation={terminal.startOperation} openTerminal={openRuntimeTerminal} signal={runtimeSignal} executeAction={desktop.execute} selectedAppId={activeAppId} onSelectApp={(appId) => { setActiveAppId(appId); recordContext("apps", appId) }} /> : null}
        {view === "workspace" ? <WorkspaceView gateway={gateway} runtimes={runtimes} restart={gateway.restartRuntime} signal={(kind) => runtimeSignal(kind)} /> : null}
        {view === "hub" ? <HubView gateway={gateway} focusFeature={hubFeature} onResume={(session) => { setHubFeature(undefined); setActiveAppId(session.appId); setView(session.area) }} /> : null}
        {view === "agents" ? <OperationalArea title="AGENTES" eyebrow="COWORKING / WORKBENCH" description="Tarefas e execuções permanecem sob autoridade do Workbench." action="Abrir Workbench em Apps" onAction={() => { setActiveAppId("matriz-workbench"); chooseView("apps") }} /> : null}
        {view === "environments" ? <WorkspaceView gateway={gateway} runtimes={runtimes} restart={gateway.restartRuntime} signal={(kind) => runtimeSignal(kind)} /> : null}
        {view === "infra" ? <OperationalArea title="INFRA" eyebrow="LOCAL / SERVIÇOS" description="O cockpit local será habilitado serviço por serviço, com prévia e confirmação." /> : null}
        {view === "git" ? <GitSummary pulse={pulse} refresh={() => gateway.workspacePulse().then(setPulse)} /> : null}
        {view === "terminal" ? <TerminalView state={terminal.state} create={() => void createTerminal()} activate={terminal.activate} interrupt={(id) => void terminal.interrupt(id)} close={(id) => void terminal.close(id)} renderPane={(session) => <TerminalPane key={session.id} session={session} gateway={gateway} register={terminal.register} />} /> : null}
        {view === "actions" ? <ActionsView pulse={pulse} gateway={gateway} runtimes={runtimes} activeGate={activeGate} setActiveGate={setActiveGate} feedback={safeFeedback} startOperation={terminal.startOperation} signal={(kind) => runtimeSignal(kind)} /> : null}
        {view === "store" ? <StoreView gateway={gateway} signal={(kind) => runtimeSignal(kind)} openControl={(featureId) => { setHubFeature(featureId); setView("hub") }} /> : null}
        {view === "doctor" ? <DoctorView checks={checks} refresh={() => gateway.doctor().then(setChecks)} /> : null}
        {view === "settings" && desktop.settings ? <SettingsView settings={desktop.settings} workspacePath={workspacePath} setWorkspacePath={setWorkspacePath} save={saveSettings} selectWorkspace={async () => { const selected = await desktop.execute(() => gateway.selectWorkspace(workspacePath), "Workspace pronto"); setWorkspacePath(selected); desktop.setSettings({ ...desktop.settings!, workspacePath: selected }); void safeFeedback.play("success") }} quit={() => { void safeFeedback.play("system.end"); void gateway.quit() }} /> : null}
      </main>

      {view !== "terminal" ? (
        <TerminalDock
          open={terminal.state.dockOpen}
          height={terminalDockHeight}
          state={terminal.state}
          setOpen={terminal.setDockOpen}
          resize={setTerminalDockHeight}
          commitResize={commitTerminalDockHeight}
          create={() => void createTerminal()}
          activate={terminal.activate}
          interrupt={(id) => void terminal.interrupt(id)}
          close={(id) => void terminal.close(id)}
          renderPane={(session) => <TerminalPane key={session.id} session={session} gateway={gateway} register={terminal.register} />}
        />
      ) : null}

      <footer><span className={desktop.message.includes("não") ? "error" : ""} role="status" aria-live="polite">{desktop.message}</span><kbd>Ctrl K</kbd></footer>
      <CommandDeck commands={deckCommands} execute={executeDeck} />
    </div>
  )
}

export function AppsView({ apps, sessions, nativeApp, setNativeApp, gateway, refresh, feedback, executeAction, startOperation, closeOperation }: { apps: readonly AppRuntime[]; sessions: readonly TerminalSession[]; nativeApp: NativeAppRuntime; setNativeApp(value: NativeAppRuntime): void; gateway: DesktopGateway; refresh(): Promise<unknown>; feedback: Feedback; executeAction: ExecuteAction; startOperation(id: ManagedOperationId): Promise<unknown>; closeOperation(id: string): Promise<unknown> }) {
  const [adminMode, setAdminMode] = useState<"web" | "native">("web")
  const states = new Map(apps.map((app) => [app.id, app]))
  const act = async (id: (typeof MATRIZ_DESKTOP_APPS)[number]["id"], ready: boolean) => {
    try {
      await executeAction(async () => {
        if (id === "matriz-admin" && adminMode === "native") {
          if (nativeApp.state === "not-built") await startOperation("app.matriz-admin.native.build")
          else if (nativeApp.state === "built") setNativeApp(await gateway.installNativeApp())
          else if (nativeApp.state === "installed") setNativeApp(await gateway.startNativeApp())
          else setNativeApp(await gateway.stopNativeApp())
        } else if (ready) {
          const operationId = `app.${id}.web` as ManagedOperationId
          const managed = sessions.find((session) => session.operationId === operationId)
          if (managed) await closeOperation(managed.id)
          else await gateway.stopApp(id)
        } else await startOperation(`app.${id}.web`)
      }, id === "matriz-admin" && adminMode === "native" ? `${nativeAction} concluído` : ready ? `${id} parado` : `${id} iniciado`)
      void feedback.play(ready ? "success" : "navigation")
      window.setTimeout(() => void refresh(), 650)
    } catch { void feedback.play("error") }
  }
  const nativeAction = nativeApp.state === "not-built" ? "Gerar" : nativeApp.state === "built" ? "Instalar" : nativeApp.state === "installed" ? "Abrir" : "Fechar"
  return <section aria-labelledby="apps-title"><div className="section-head"><div><span className="eyebrow">ECOSSISTEMA / 09</span><h1 id="apps-title">APPS</h1></div></div><div className="app-grid">{MATRIZ_DESKTOP_APPS.map((app) => { const state = states.get(app.id); const ready = state?.status === "ready"; const operationId = `app.${app.id}.web` as ManagedOperationId; const managed = sessions.some((session) => session.operationId === operationId); const external = ready && !managed; const native = app.id === "matriz-admin" && adminMode === "native"; const nativeRunning = native && nativeApp.state === "running"; const actionLabel = external ? `Porta ocupada externamente: ${app.label}` : `${ready ? "Parar" : "Iniciar"} ${app.label}`; return <article className={`app-tile${app.id === "matriz-admin" ? " app-tile--seumei" : ""}`} key={app.id}><span className={`status-dot ${external ? "degraded" : nativeRunning || (!native && ready) ? "ready" : "stopped"}`} /><div><strong>{app.label}</strong><small>{native ? nativeApp.state.toUpperCase() : external ? `:${app.port} EXTERNO` : `:${app.port}`}</small></div>{app.id === "matriz-admin" ? <div className="app-runtime-switch" role="group" aria-label="Modo do Matriz Admin"><button aria-label="Matriz Admin Web" aria-pressed={adminMode === "web"} onClick={() => setAdminMode("web")}>WEB</button><button aria-label="Matriz Admin Nativo" aria-pressed={adminMode === "native"} onClick={() => setAdminMode("native")}>NATIVO</button></div> : null}<button className="app-launch" aria-label={native ? `${nativeAction} Matriz Admin nativo` : actionLabel} disabled={!native && external} onClick={() => void act(app.id, ready)}>{nativeRunning || (!native && ready) ? <Icons.stop /> : <Icons.play />}</button></article> })}</div></section>
}

function ActionsView({ pulse, gateway, runtimes, activeGate, setActiveGate, feedback, startOperation, signal }: { pulse?: WorkspacePulse; gateway: DesktopGateway; runtimes: readonly RuntimeInstance[]; activeGate?: GateId; setActiveGate(value?: GateId): void; feedback: Feedback; startOperation(id: ManagedOperationId): Promise<unknown>; signal(kind: "success" | "error"): void }) {
  const run = async (id: GateId) => { setActiveGate(id); try { await startOperation(`gate.${id}`); void feedback.play("navigation") } catch { void feedback.play("error") } finally { setActiveGate(undefined) } }
  return <section aria-labelledby="actions-title"><div className="section-head"><div><span className="eyebrow">WORKSPACE / {pulse?.clean ? "CLEAN" : `${pulse?.changedFiles ?? "—"} Δ`}</span><h1 id="actions-title">AÇÕES</h1></div><Badge tone={pulse?.clean ? "success" : "warning"}>{pulse?.branch ?? "—"}</Badge></div><h2>GATES</h2><div className="action-grid">{GATES.map((gate) => <Button variant="secondary" key={gate.id} disabled={Boolean(activeGate)} onClick={() => void run(gate.id)}>{activeGate === gate.id ? "•••" : gate.label}</Button>)}</div><h2>JUMP</h2><div className="jump-list">{QUICK_TARGETS.map((target) => <button key={target.id} onClick={() => void gateway.openTarget(target.id)}><span>{target.label}</span><Icons.external /></button>)}</div><RunbookPanel gateway={gateway} runtimes={runtimes} signal={signal} /></section>
}

function GitSummary({ pulse, refresh }: { pulse?: WorkspacePulse; refresh(): Promise<unknown> }) {
  return <section className="git-summary" aria-labelledby="git-title"><div className="section-head"><div><span className="eyebrow">WORKSPACE / VERSIONAMENTO</span><h1 id="git-title">GIT</h1></div><button className="round-action" aria-label="Atualizar Git" onClick={() => void refresh()}><Icons.refresh /></button></div><div className="git-branch"><span className={`status-dot ${pulse?.clean ? "ready" : "degraded"}`} /><div><small>BRANCH ATUAL</small><strong>{pulse?.branch ?? "Verificando…"}</strong></div><b>{pulse ? `${pulse.changedFiles} mudanças` : "—"}</b></div><p className="area-note">Operações mutáveis serão liberadas somente com snapshot e revisão nativos.</p></section>
}

function OperationalArea({ title, eyebrow, description, action, onAction }: { title: string; eyebrow: string; description: string; action?: string; onAction?(): void }) {
  return <section className="operational-area" aria-labelledby={`${title.toLowerCase()}-title`}><div className="section-head"><div><span className="eyebrow">{eyebrow}</span><h1 id={`${title.toLowerCase()}-title`}>{title}</h1><p>{description}</p></div></div>{action && onAction ? <button aria-label={action} onClick={onAction}>{action}<span>→</span></button> : <p className="area-note">Nenhuma operação é executada automaticamente.</p>}</section>
}

function SettingsView({ settings, workspacePath, setWorkspacePath, save, selectWorkspace, quit }: { settings: DesktopSettings; workspacePath: string; setWorkspacePath(value: string): void; save(patch: Partial<DesktopSettings>): Promise<void>; selectWorkspace(): Promise<void>; quit(): void }) {
  return <section aria-labelledby="settings-title"><div className="section-head"><div><span className="eyebrow">LOCAL / PREFERÊNCIAS</span><h1 id="settings-title">AJUSTES</h1></div></div><ThemePicker theme={settings.theme} select={(theme) => void save({ theme })} /><div className="settings-list"><label><span>Sons</span><input type="checkbox" checked={settings.soundsEnabled} onChange={(event) => void save({ soundsEnabled: event.target.checked })} /></label><label><span>Volume</span><input aria-label="Volume" type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(event) => void save({ volume: Number(event.target.value) })} /></label><label><span>Tray ao fechar</span><input type="checkbox" checked={settings.closeToTray} onChange={(event) => void save({ closeToTray: event.target.checked })} /></label><label><span>Iniciar com Windows</span><input type="checkbox" checked={settings.startWithWindows} onChange={(event) => void save({ startWithWindows: event.target.checked })} /></label></div><div className="workspace-field"><Input aria-label="Workspace" placeholder="C:\Apps\matriz-infra-hub" value={workspacePath} onChange={(event) => setWorkspacePath(event.target.value)} /><Button variant="secondary" onClick={() => void selectWorkspace()}>USAR</Button></div><Button className="quit-button" variant="ghost" onClick={quit}>SAIR DO CONTROL</Button></section>
}
