import { useEffect, useMemo, useRef, useState } from "react"

import { executeRuntimeAction, getRuntimeActions, type ActionServices, type RuntimeActionId } from "../../application/action-registry"
import { APP_MANIFESTS } from "../../application/app-manifests"
import { MATRIZ_DESKTOP_APPS } from "../../application/catalog"
import type { DesktopGateway } from "../../application/desktop-gateway"
import type { ActivityEnvelope, DesktopAppId, ManagedOperationId, NativeAppRuntime, RuntimeInstance, StorePackage } from "../../domain/types"
import { DESKTOP_APP_GROUPS_KEY, defaultDesktopAppGroup, desktopGroupId, normalizeDesktopAppGroups, orderDesktopApps, reorderDesktopApps, type DesktopAppGroup } from "../apps/app-groups"

type Surface = "terminal" | "preview" | "logs"
type GroupLogStatus = "queued" | "starting" | "success" | "failed" | "stopped"
interface GroupLog { readonly id: DesktopAppId; readonly name: string; readonly status: GroupLogStatus; readonly detail: string }
interface GroupRun { readonly groupName: string; readonly phase: "running" | "completed" | "stopped"; readonly logs: readonly GroupLog[] }

export function RuntimeWorkspace({ gateway, runtimes, refresh, startOperation, openTerminal, signal, executeAction, selectedAppId: resumedAppId, onSelectApp }: {
  gateway: DesktopGateway
  runtimes: readonly RuntimeInstance[]
  refresh(): Promise<unknown>
  startOperation(id: ManagedOperationId): Promise<unknown>
  openTerminal(): void
  signal(kind: "navigation" | "success" | "error"): void
  executeAction<T>(action: () => Promise<T>, success: string): Promise<T>
  selectedAppId?: DesktopAppId
  onSelectApp?(appId: DesktopAppId): void
}) {
  const [selectedId, setSelectedId] = useState<RuntimeInstance["id"]>("matriz-admin")
  const [surface, setSurface] = useState<Surface>("terminal")
  const [routeOpen, setRouteOpen] = useState(false)
  const [route, setRoute] = useState("/")
  const [manualRoute, setManualRoute] = useState("")
  const [activities, setActivities] = useState<readonly ActivityEnvelope[]>([])
  const [adminMode, setAdminMode] = useState<"web" | "native">("web")
  const [nativeApp, setNativeApp] = useState<NativeAppRuntime>({ appId: "matriz-admin", state: "not-built" })
  const [recovering, setRecovering] = useState(false)
  const [capabilities, setCapabilities] = useState<readonly StorePackage[]>([])
  const [groups, setGroups] = useState<DesktopAppGroup[]>([])
  const [activeGroupId, setActiveGroupId] = useState("matriz")
  const [newGroupName, setNewGroupName] = useState("")
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [groupRun, setGroupRun] = useState<GroupRun | null>(null)
  const draggedApp = useRef<DesktopAppId | null>(null)
  const groupRunId = useRef<string | null>(null)
  const previewHost = useRef<HTMLDivElement>(null)

  useEffect(() => { if (resumedAppId) setSelectedId(resumedAppId) }, [resumedAppId])

  useEffect(() => {
    let stored: unknown = null
    try { stored = JSON.parse(localStorage.getItem(DESKTOP_APP_GROUPS_KEY) ?? "null") } catch { stored = null }
    const next = stored ? normalizeDesktopAppGroups(stored) : [defaultDesktopAppGroup()]
    setGroups(next)
    setActiveGroupId(next[0]?.id ?? "matriz")
  }, [])

  useEffect(() => {
    void gateway.activityHistory().then((history) => setActivities((current) => {
      const merged = new Map([...history, ...current].map((event) => [event.sequence, event]))
      return [...merged.values()].sort((left, right) => left.sequence - right.sequence).slice(-200)
    }))
    void gateway.getNativeAppRuntime().then(setNativeApp)
    void gateway.commerceSnapshot().then(({ packages }) => setCapabilities(packages.filter((item) => item.installed && item.trustStatus === "verified"))).catch(() => setCapabilities([]))
    void gateway.subscribeActivity((event) => setActivities((current) => [...current, event].slice(-200)))
  }, [gateway])

  const selected = runtimes.find(({ id }) => id === selectedId) ?? runtimes[0]
  const selectedAppId = selected?.id
  const manifest = selected ? APP_MANIFESTS[selected.id] : undefined
  const selectedCapabilities = selected ? capabilities.filter(({ appId }) => appId === selected.id) : []
  const capabilityNames = selectedCapabilities.map(({ name }) => name).join(" · ")
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0] ?? null
  const groupApps = useMemo(() => activeGroup ? activeGroup.appIds.map((id) => MATRIZ_DESKTOP_APPS.find((app) => app.id === id)).filter((app): app is (typeof MATRIZ_DESKTOP_APPS)[number] => Boolean(app)) : [], [activeGroup])

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
  const recover = async () => {
    if (!selected) return
    setRecovering(true)
    try {
      await executeAction(() => gateway.recoverRuntime(selected.id), `${selected.label} recuperado`)
      signal("success")
      await refresh()
    } catch {
      signal("error")
    } finally {
      setRecovering(false)
    }
  }

  const saveGroups = (next: DesktopAppGroup[]) => {
    setGroups(next)
    try { localStorage.setItem(DESKTOP_APP_GROUPS_KEY, JSON.stringify(next)) } catch { /* The current session remains usable without persistence. */ }
  }

  const selectGroup = (id: string) => {
    setActiveGroupId(id)
    const next = groups.find((group) => group.id === id)
    const first = next?.appIds[0]
    if (first) { setSelectedId(first); onSelectApp?.(first) }
    setReportOpen(false)
  }

  const createGroup = () => {
    const name = newGroupName.trim()
    if (!name) return
    const group = { id: desktopGroupId(name, groups.map((item) => item.id)), name, appIds: [] as DesktopAppId[] }
    saveGroups([...groups, group])
    setActiveGroupId(group.id)
    setSelectedId("matriz-hub")
    setNewGroupName("")
    setCreatingGroup(false)
  }

  const addToGroup = (id: DesktopAppId) => {
    if (!activeGroup || activeGroup.appIds.includes(id)) return
    saveGroups(groups.map((group) => group.id === activeGroup.id ? { ...group, appIds: [...group.appIds, id] } : group))
    setSelectedId(id)
    onSelectApp?.(id)
  }

  const reorderGroup = (draggedId: DesktopAppId, targetId: DesktopAppId) => {
    if (!activeGroup) return
    saveGroups(groups.map((group) => group.id === activeGroup.id ? { ...group, appIds: reorderDesktopApps(group.appIds, draggedId, targetId) } : group))
  }

  const updateLog = (id: DesktopAppId, patch: Pick<GroupLog, "status" | "detail">) => setGroupRun((current) => current ? { ...current, logs: current.logs.map((log) => log.id === id ? { ...log, ...patch } : log) } : current)

  const runGroup = async () => {
    if (!activeGroup || !activeGroup.appIds.length || groupRun?.phase === "running") return
    const id = `${activeGroup.id}-${Date.now()}`
    groupRunId.current = id
    setGroupRun({ groupName: activeGroup.name, phase: "running", logs: groupApps.map((app) => ({ id: app.id, name: app.label, status: "queued", detail: "Aguardando sua vez" })) })
    setReportOpen(true)
    for (const app of groupApps) {
      if (groupRunId.current !== id) return
      const state = runtimes.find((runtime) => runtime.id === app.id)
      updateLog(app.id, { status: "starting", detail: "Solicitando início seguro" })
      if (state?.ownership === "external") { updateLog(app.id, { status: "failed", detail: "Porta externa; processo preservado" }); continue }
      if (state?.status === "ready") { updateLog(app.id, { status: "success", detail: "Já estava disponível" }); continue }
      try { await startOperation(`app.${app.id}.web` as ManagedOperationId); updateLog(app.id, { status: "success", detail: "Sessão gerenciada iniciada" }) }
      catch (cause: unknown) { updateLog(app.id, { status: "failed", detail: cause instanceof Error ? cause.message : "Falha ao iniciar" }) }
    }
    if (groupRunId.current === id) setGroupRun((current) => current ? { ...current, phase: "completed" } : current)
  }

  const stopGroup = async () => {
    if (!activeGroup) return
    groupRunId.current = null
    const owned = runtimes.filter((runtime) => activeGroup.appIds.includes(runtime.id) && runtime.ownership === "managed" && runtime.status !== "stopped")
    await Promise.allSettled(owned.map((runtime) => gateway.stopRuntime(runtime.id)))
    setGroupRun((current) => current ? { ...current, phase: "stopped", logs: current.logs.map((log) => activeGroup.appIds.includes(log.id) && ["queued", "starting"].includes(log.status) ? { ...log, status: "stopped", detail: "Interrompido pelo operador" } : log) } : current)
    setReportOpen(true)
    await refresh()
  }

  return <section className="runtime-workspace" aria-labelledby="apps-title">
    <div className="runtime-catalog">
      <div className="section-head"><div><span className="eyebrow">ECOSSISTEMA / {activeGroup?.appIds.length.toString().padStart(2, "0") ?? "00"}</span><h1 id="apps-title">APPS</h1></div><div className="desktop-group-actions"><button className="group-play" aria-label={`Iniciar grupo ${activeGroup?.name ?? "Matriz"}`} onClick={() => void runGroup()} disabled={!activeGroup?.appIds.length || groupRun?.phase === "running"}>▶ <span>{groupRun?.phase === "running" ? "EXECUTANDO" : "PLAY"}</span></button><button aria-label={`Parar grupo ${activeGroup?.name ?? "Matriz"}`} onClick={() => void stopGroup()} disabled={!activeGroup?.appIds.length}>■ <span>PARAR</span></button><button aria-label="Mostrar relatório da sequência" aria-expanded={reportOpen} onClick={() => setReportOpen((value) => !value)}>◒ <span>RELATÓRIO</span></button></div></div>
      <div className="desktop-group-toolbar"><div className="desktop-group-tabs" aria-label="Grupos de apps">{groups.map((group) => <button key={group.id} aria-pressed={group.id === activeGroup?.id} onClick={() => selectGroup(group.id)}><span className="desktop-group-mark">M</span>{group.name}<small>{group.appIds.length}</small></button>)}<button className="desktop-group-new" onClick={() => setCreatingGroup((value) => !value)}>+ NOVO GRUPO</button></div>{creatingGroup ? <div className="desktop-group-form"><input aria-label="Nome do novo grupo" placeholder="Nome do grupo" value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createGroup() }} /><button onClick={createGroup}>CRIAR</button></div> : null}{activeGroup && activeGroup.id !== "matriz" ? <div className="desktop-group-add"><button onClick={() => setPickerOpen((value) => !value)}>{pickerOpen ? "FECHAR" : "+ ADICIONAR APP"}</button>{pickerOpen ? <div className="desktop-group-picker">{MATRIZ_DESKTOP_APPS.filter((app) => !activeGroup.appIds.includes(app.id)).map((app) => <button key={app.id} onClick={() => addToGroup(app.id)}>{app.label}<span>+</span></button>)}</div> : null}</div> : <small className="desktop-group-note">Sequência principal · Hub → Workbench → produtos</small>}</div>
      {reportOpen && groupRun ? <section className="desktop-group-report" aria-label="Relatório da sequência" aria-live="polite"><header><span>RELATÓRIO · {groupRun.groupName.toUpperCase()}</span><b>{groupRun.phase === "running" ? "EM EXECUÇÃO" : groupRun.phase === "stopped" ? "INTERROMPIDO" : "CONCLUÍDO"}</b></header>{groupRun.logs.map((log) => <div className={`desktop-group-log ${log.status}`} key={log.id}><i>{log.status === "success" ? "✓" : log.status === "failed" ? "!" : log.status === "stopped" ? "×" : "·"}</i><span><strong>{log.name}</strong><small>{log.detail}</small></span><b>{log.status === "success" ? "OK" : log.status === "failed" ? "FALHA" : log.status === "stopped" ? "PARADO" : log.status === "starting" ? "AGORA" : "FILA"}</b></div>)}</section> : null}
      <div className="runtime-list">
        {groupApps.map((app) => { const runtime = runtimes.find((item) => item.id === app.id); return <div className="runtime-row-wrap" draggable onDragStart={() => { draggedApp.current = app.id }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedApp.current) reorderGroup(draggedApp.current, app.id); draggedApp.current = null }} key={app.id}><button className="runtime-row" aria-pressed={app.id === selected?.id} onClick={() => { if (surface === "preview") setSurface("terminal"); setSelectedId(app.id); onSelectApp?.(app.id); signal("navigation") }}><span className={`status-dot ${runtime?.status ?? "stopped"}`} /><span><strong>{app.label}</strong><small>:{app.port} · {runtime?.ownership === "external" ? "EXTERNO" : runtime?.status.toUpperCase() ?? "STOPPED"}</small></span><b>›</b></button></div>})}
      </div>
    </div>

    <div className="runtime-stage">
      {selected ? <>
        <header className="runtime-context"><div><span className={`status-dot ${selected.status}`} /><strong>{selected.label}</strong><small>{adminMode === "native" && selected.id === "matriz-admin" ? nativeApp.state.toUpperCase() : selected.endpoint}</small>{selectedCapabilities.length ? <span className="runtime-capabilities" aria-label={`${selectedCapabilities.length} ${selectedCapabilities.length === 1 ? "capacidade ativa" : "capacidades ativas"}: ${capabilityNames}`}><b>{selectedCapabilities.length} {selectedCapabilities.length === 1 ? "CAPACIDADE ATIVA" : "CAPACIDADES ATIVAS"}</b> · {capabilityNames}</span> : null}</div>{selected.id === "matriz-admin" ? <div className="runtime-mode"><button aria-label="Matriz Admin Web" aria-pressed={adminMode === "web"} onClick={() => setAdminMode("web")}>WEB</button><button aria-label="Matriz Admin Nativo" aria-pressed={adminMode === "native"} onClick={() => setAdminMode("native")}>NATIVO</button></div> : <span className={`ownership ownership--${selected.ownership}`}>{selected.ownership}</span>}</header>
        <div className="surface-tabs" role="tablist">
          {(["terminal", "preview", "logs"] as const).map((id) => <button key={id} role="tab" aria-selected={surface === id} onClick={() => setSurface(id)}>{id}</button>)}
        </div>
        <div className="route-bar"><span>ROTA</span><button onClick={() => setRouteOpen((value) => !value)}>{route}⌄</button><code>{new URL(route, selected.endpoint).toString()}</code><button onClick={() => void execute("runtime.open")}>Abrir ↗</button></div>
        {routeOpen && manifest ? <div className="route-picker">
          <label>ABRIR ROTA<input autoFocus placeholder="/rota" value={manualRoute} onChange={(event) => setManualRoute(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && validManual) chooseRoute(manualRoute) }} /></label>
          <div>{manifest.routes.map((item) => <button key={item.path} disabled={!item.openable} onClick={() => chooseRoute(item.path)}><span>{item.path}</span><small>{item.label}</small></button>)}</div>
        </div> : null}
        <div className="quick-actions" aria-label="Ações rápidas">
          {selected.status === "degraded" ? <div className={`runtime-recovery runtime-recovery--${selected.ownership}`}><span><strong>{selected.ownership === "external" ? "RUNTIME EXTERNO" : "RECUPERAÇÃO DISPONÍVEL"}</strong><small>{selected.ownership === "external" ? "A porta pertence a outro processo e será preservada." : "O último processo encerrou antes da porta ficar pronta."}</small></span>{selected.ownership === "managed" ? <button aria-label={`Recuperar ${selected.label}`} disabled={recovering} onClick={() => void recover()}>{recovering ? "RECUPERANDO…" : "RECUPERAR"}</button> : null}</div> : null}
          <span>AÇÕES RÁPIDAS</span><div>{adminMode === "native" && selected.id === "matriz-admin" ? <button aria-label={`${nativeAction} Matriz Admin nativo`} onClick={() => void runNative()}>{nativeAction} nativo</button> : actions.map((action) => <button key={action.id} aria-label={`${action.label} ${selected.label}`} className={action.risk === "destructive" ? "is-danger" : ""} onClick={() => void execute(action.id)}>{action.label}</button>)}</div>
        </div>
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
