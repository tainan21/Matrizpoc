import { useEffect, useMemo, useRef, useState } from "react"

import { executeRuntimeAction, getRuntimeActions, type ActionServices, type RuntimeActionId } from "../../application/action-registry"
import { APP_MANIFESTS } from "../../application/app-manifests"
import type { DesktopGateway } from "../../application/desktop-gateway"
import type { ActivityEnvelope, ManagedOperationId, NativeAppRuntime, RuntimeInstance } from "../../domain/types"

type Surface = "terminal" | "preview" | "logs"

export function RuntimeWorkspace({ gateway, runtimes, refresh, startOperation, openTerminal, signal, executeAction }: {
  gateway: DesktopGateway
  runtimes: readonly RuntimeInstance[]
  refresh(): Promise<unknown>
  startOperation(id: ManagedOperationId): Promise<unknown>
  openTerminal(): void
  signal(kind: "navigation" | "success" | "error"): void
  executeAction<T>(action: () => Promise<T>, success: string): Promise<T>
}) {
  const [selectedId, setSelectedId] = useState<RuntimeInstance["id"]>("matriz-admin")
  const [surface, setSurface] = useState<Surface>("terminal")
  const [routeOpen, setRouteOpen] = useState(false)
  const [route, setRoute] = useState("/")
  const [manualRoute, setManualRoute] = useState("")
  const [activities, setActivities] = useState<readonly ActivityEnvelope[]>([])
  const [adminMode, setAdminMode] = useState<"web" | "native">("web")
  const [nativeApp, setNativeApp] = useState<NativeAppRuntime>({ appId: "matriz-admin", state: "not-built" })
  const previewHost = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void gateway.activityHistory().then((history) => setActivities((current) => {
      const merged = new Map([...history, ...current].map((event) => [event.sequence, event]))
      return [...merged.values()].sort((left, right) => left.sequence - right.sequence).slice(-200)
    }))
    void gateway.getNativeAppRuntime().then(setNativeApp)
    void gateway.subscribeActivity((event) => setActivities((current) => [...current, event].slice(-200)))
  }, [gateway])

  const selected = runtimes.find(({ id }) => id === selectedId) ?? runtimes[0]
  const selectedAppId = selected?.id
  const manifest = selected ? APP_MANIFESTS[selected.id] : undefined

  useEffect(() => {
    if (!manifest) return
    setRoute(manifest.primaryRoute)
    setRouteOpen(false)
  }, [manifest, selectedId])

  useEffect(() => {
    if (surface !== "preview" || !selectedAppId || !previewHost.current) return
    const host = previewHost.current
    const bounds = () => {
      const rect = host.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }
    void gateway.openPreview({ appId: selectedAppId, routePath: route }, bounds()).catch(() => signal("error"))
    const observer = new ResizeObserver(() => void gateway.setPreviewBounds(bounds()).catch(() => undefined))
    observer.observe(host)
    return () => { observer.disconnect(); void gateway.closePreview().catch(() => undefined) }
  }, [gateway, selectedAppId, signal, surface])

  const context = selected ? { runtime: selected, activeRoute: route, previewOpen: surface === "preview" } : undefined
  const actions = context ? getRuntimeActions(context) : []
  const services = useMemo<ActionServices>(() => ({
    start: (appId) => startOperation(`app.${appId}.web`).then(() => undefined),
    open: (target) => gateway.openRuntimeTarget(target),
    preview: () => setSurface("preview"),
    chooseRoute: () => setRouteOpen(true),
    copyUrl: async ({ appId, routePath }) => {
      const runtime = runtimes.find(({ id }) => id === appId)
      if (!runtime) throw new Error("Runtime unavailable")
      await navigator.clipboard.writeText(new URL(routePath, runtime.endpoint).toString())
    },
    restart: (appId) => gateway.restartRuntime(appId).then(() => undefined),
    stop: (appId) => gateway.stopRuntime(appId),
    focusTerminal: () => openTerminal(),
    clearTerminal: (sessionId) => gateway.writeTerminal(sessionId, "\u000c"),
  }), [gateway, openTerminal, runtimes, startOperation, surface])

  const execute = async (id: RuntimeActionId) => {
    if (!context) return
    try { await executeRuntimeAction(id, context, services); signal(id === "runtime.stop" ? "navigation" : "success"); void refresh() }
    catch { signal("error") }
  }

  const chooseRoute = (path: string) => {
    setRoute(path); setRouteOpen(false); setManualRoute("")
    if (surface === "preview" && selected) void gateway.navigatePreview({ appId: selected.id, routePath: path }).catch(() => signal("error"))
  }
  const validManual = manualRoute.length <= 2048 && manualRoute.startsWith("/") && !manualRoute.startsWith("//") && !manualRoute.includes("\\") && !manualRoute.includes("://") && !manualRoute.includes("..") && ![...manualRoute].some((character) => /[\u0000-\u001f\u007f]/.test(character))
  const nativeAction = nativeApp.state === "not-built" ? "Gerar" : nativeApp.state === "built" ? "Instalar" : nativeApp.state === "installed" ? "Abrir" : "Fechar"
  const runNative = async () => {
    try {
      await executeAction(async () => {
        if (nativeApp.state === "not-built") await startOperation("app.matriz-admin.native.build")
        else if (nativeApp.state === "built") setNativeApp(await gateway.installNativeApp())
        else if (nativeApp.state === "installed") setNativeApp(await gateway.startNativeApp())
        else setNativeApp(await gateway.stopNativeApp())
      }, `${nativeAction} Matriz Admin concluído`)
      signal("success")
    } catch { signal("error") }
  }

  return <section className="runtime-workspace" aria-labelledby="apps-title">
    <div className="runtime-catalog">
      <div className="section-head"><div><span className="eyebrow">ECOSSISTEMA / 09</span><h1 id="apps-title">APPS</h1></div></div>
      <div className="runtime-list">
        {runtimes.map((runtime) => <button key={runtime.id} className="runtime-row" aria-pressed={runtime.id === selected?.id} onClick={() => { if (surface === "preview") setSurface("terminal"); setSelectedId(runtime.id); signal("navigation") }}>
          <span className={`status-dot ${runtime.status}`} /><span><strong>{runtime.label}</strong><small>:{runtime.port} · {runtime.ownership === "external" ? "EXTERNO" : runtime.status.toUpperCase()}</small></span><b>›</b>
        </button>)}
      </div>
    </div>

    <div className="runtime-stage">
      {selected ? <>
        <header className="runtime-context"><div><span className={`status-dot ${selected.status}`} /><strong>{selected.label}</strong><small>{adminMode === "native" && selected.id === "matriz-admin" ? nativeApp.state.toUpperCase() : selected.endpoint}</small></div>{selected.id === "matriz-admin" ? <div className="runtime-mode"><button aria-label="Matriz Admin Web" aria-pressed={adminMode === "web"} onClick={() => setAdminMode("web")}>WEB</button><button aria-label="Matriz Admin Nativo" aria-pressed={adminMode === "native"} onClick={() => setAdminMode("native")}>NATIVO</button></div> : <span className={`ownership ownership--${selected.ownership}`}>{selected.ownership}</span>}</header>
        <div className="surface-tabs" role="tablist">
          {(["terminal", "preview", "logs"] as const).map((id) => <button key={id} role="tab" aria-selected={surface === id} onClick={() => setSurface(id)}>{id}</button>)}
        </div>
        <div className="route-bar"><span>ROTA</span><button onClick={() => setRouteOpen((value) => !value)}>{route}⌄</button><code>{new URL(route, selected.endpoint).toString()}</code><button onClick={() => void execute("runtime.open")}>Abrir ↗</button></div>
        {routeOpen && manifest ? <div className="route-picker">
          <label>ABRIR ROTA<input autoFocus placeholder="/rota" value={manualRoute} onChange={(event) => setManualRoute(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && validManual) chooseRoute(manualRoute) }} /></label>
          <div>{manifest.routes.map((item) => <button key={item.path} disabled={!item.openable} onClick={() => chooseRoute(item.path)}><span>{item.path}</span><small>{item.label}</small></button>)}</div>
        </div> : null}
        <div className="quick-actions" aria-label="Ações rápidas"><span>AÇÕES RÁPIDAS</span><div>{adminMode === "native" && selected.id === "matriz-admin" ? <button aria-label={`${nativeAction} Matriz Admin nativo`} onClick={() => void runNative()}>{nativeAction} nativo</button> : actions.map((action) => <button key={action.id} aria-label={`${action.label} ${selected.label}`} className={action.risk === "destructive" ? "is-danger" : ""} onClick={() => void execute(action.id)}>{action.label}</button>)}</div></div>
        <div className="surface-body">
          {surface === "preview" ? <div className="preview-shell"><div className="preview-controls"><button onClick={() => void gateway.previewBack()}>←</button><button onClick={() => void gateway.previewForward()}>→</button><button onClick={() => void gateway.reloadPreview()}>↻</button><span>WEBVIEW2 · {route}</span></div><div ref={previewHost} className="preview-host" aria-label={`Preview de ${selected.label}`} /></div> : null}
          {surface === "terminal" ? <button className="surface-terminal" onClick={openTerminal}><span>›_</span><strong>{selected.sessionId ? "Terminal do runtime ativo" : "Abrir terminal integrado"}</strong><small>{selected.sessionId ?? "Nova sessão segura no workspace"}</small></button> : null}
          {surface === "logs" ? <div className="runtime-logs">{activities.filter((event) => !event.appId || event.appId === selected.id).slice(-20).reverse().map((event) => <div key={event.id}><span>{event.kind}</span><strong>{event.title}</strong><small>{event.detail}</small></div>)}</div> : null}
        </div>
      </> : <div className="runtime-loading">DESCOBRINDO RUNTIMES…</div>}
    </div>

    <aside className="agent-presence"><header><span>AGENTE</span><b>● ONLINE</b></header>{activities.slice(-5).reverse().map((event) => <article key={event.id} data-severity={event.severity}><i>●</i><div><strong>{event.title}</strong><small>{event.detail ?? event.kind}</small></div><time>{new Date(Number(event.occurredAt)).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></article>)}{!activities.length ? <p>Aguardando atividade operacional.</p> : null}</aside>
  </section>
}
