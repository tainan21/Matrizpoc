"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { TerminalProject } from "../domain/terminal"
import { useTerminal } from "./terminal/terminal-context"
import { StartupPanel } from "./startup/startup-panel"
import { useInstalledApps } from "./apps/installed-apps-context"
import type { StoreAppSnapshot } from "../domain/desktop-bridge"
import { useProjectHost } from "./projects/project-host-context"
import { ProjectLibrary } from "./projects/project-library"
import { ProjectWorkspace } from "./projects/project-workspace"
import { AppGroupPanel, nextGroupId, persistAppGroups } from "./apps/app-groups-panel"
import { APP_GROUPS_STORAGE_KEY, createDefaultAppGroup, normalizeAppGroups, reorderIds, moveId, type AppGroup } from "./apps/app-groups"

export function workbenchStoreStatus(app: { installed: boolean; nativeState: StoreAppSnapshot["state"] | null }): string {
  if (app.installed) return "INSTALADO · WINDOWS"
  return app.nativeState === "unavailable" ? "INDISPONÍVEL · WINDOWS" : "DISPONÍVEL · WINDOWS"
}

type GroupLogStatus = "queued" | "starting" | "success" | "failed" | "stopped"
interface GroupLog { readonly id: string; readonly name: string; readonly status: GroupLogStatus; readonly detail: string }
interface GroupRun { readonly groupId: string; readonly groupName: string; readonly phase: "running" | "completed" | "stopped"; readonly logs: readonly GroupLog[] }

export function AppsConsole() {
  const [projects, setProjects] = useState<TerminalProject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>("matriz-workbench")
  const [error, setError] = useState<string | null>(null)
  const terminal = useTerminal()
  const { apps: installedApps, storeAction } = useInstalledApps()
  const projectHost = useProjectHost()
  const [hostSelectedId, setHostSelectedId] = useState<string | null>(null)
  const [groups, setGroups] = useState<AppGroup[]>([])
  const [activeGroupId, setActiveGroupId] = useState("matriz")
  const [reportOpen, setReportOpen] = useState(false)
  const [groupRun, setGroupRun] = useState<GroupRun | null>(null)
  const draggedId = useRef<string | null>(null)
  const runId = useRef<string | null>(null)
  const groupsInitialized = useRef(false)
  const workbench = installedApps.find((app) => app.appId === "matriz-workbench")
  const workbenchAvailable = Boolean(workbench)

  useEffect(() => {
    void fetch("/api/projects").then((response) => response.json()).then((data: { projects: TerminalProject[] }) => setProjects(data.projects)).catch(() => setError("Não foi possível ler os projetos."))
  }, [])

  useEffect(() => {
    if (groupsInitialized.current || !projects.length) return
    const knownIds = [...projects.map((project) => project.id), ...(workbenchAvailable ? ["matriz-workbench"] : [])]
    let stored: unknown = null
    try { stored = JSON.parse(window.localStorage.getItem(APP_GROUPS_STORAGE_KEY) ?? "null") } catch { stored = null }
    const next = stored ? normalizeAppGroups(stored, knownIds) : [createDefaultAppGroup(knownIds)]
    setGroups(next)
    setActiveGroupId(next[0]?.id ?? "matriz")
    groupsInitialized.current = true
    persistAppGroups(next)
  }, [projects, workbenchAvailable])

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0] ?? null
  const items = useMemo(() => {
    if (!activeGroup) return []
    return activeGroup.projectIds.flatMap((id) => {
      if (id === "matriz-workbench" && workbench) return [{ id, name: workbench.name, project: null as TerminalProject | null, workbench: true }]
      const project = projects.find((item) => item.id === id)
      return project ? [{ id, name: project.name, project, workbench: false }] : []
    })
  }, [activeGroup, projects, workbench])
  const selected = projects.find((project) => project.id === selectedId) ?? null
  const session = terminal.sessions.find((item) => item.projectId === selectedId && item.actionId === "dev")
  const selectedUrl = selected?.port ? `http://localhost:${selected.port}/` : "URL não declarada"
  const hostSelected = projectHost.projects.find((item) => item.id === hostSelectedId) ?? projectHost.projects[0] ?? null

  useEffect(() => {
    if (selectedId && items.some((item) => item.id === selectedId)) return
    setSelectedId(items[0]?.id ?? null)
  }, [items, selectedId])

  function saveGroups(next: AppGroup[]) {
    setGroups(next)
    persistAppGroups(next)
  }

  function selectGroup(groupId: string) {
    setActiveGroupId(groupId)
    const next = groups.find((group) => group.id === groupId)
    setSelectedId(next?.projectIds[0] ?? null)
    setReportOpen(false)
  }

  function createGroup(name: string) {
    const group: AppGroup = { id: nextGroupId(name, groups), name, projectIds: [] }
    saveGroups([...groups, group])
    setActiveGroupId(group.id)
    setSelectedId(null)
  }

  function addToActiveGroup(projectId: string) {
    if (!activeGroup || activeGroup.projectIds.includes(projectId)) return
    saveGroups(groups.map((group) => group.id === activeGroup.id ? { ...group, projectIds: [...group.projectIds, projectId] } : group))
    setSelectedId(projectId)
  }

  function reorderActiveGroup(dragged: string, target: string) {
    if (!activeGroup) return
    const projectIds = reorderIds(activeGroup.projectIds, dragged, target)
    saveGroups(groups.map((group) => group.id === activeGroup.id ? { ...group, projectIds } : group))
  }

  function moveActiveItem(id: string, direction: -1 | 1) {
    if (!activeGroup) return
    const projectIds = moveId(activeGroup.projectIds, id, direction)
    saveGroups(groups.map((group) => group.id === activeGroup.id ? { ...group, projectIds } : group))
  }

  async function runGroup() {
    if (!activeGroup || groupRun?.phase === "running" || !activeGroup.projectIds.length) return
    const currentRunId = `${activeGroup.id}-${Date.now()}`
    runId.current = currentRunId
    const initialLogs: GroupLog[] = items.map((item) => ({ id: item.id, name: item.name, status: "queued", detail: "Aguardando sua vez" }))
    setGroupRun({ groupId: activeGroup.id, groupName: activeGroup.name, phase: "running", logs: initialLogs })
    setReportOpen(true)
    for (const item of items) {
      if (runId.current !== currentRunId) return
      setGroupRun((current) => current ? { ...current, logs: current.logs.map((log) => log.id === item.id ? { ...log, status: "starting", detail: "Solicitando início seguro" } : log) } : current)
      if (item.workbench) {
        setGroupRun((current) => current ? { ...current, logs: current.logs.map((log) => log.id === item.id ? { ...log, status: "success", detail: "Aplicativo nativo disponível; mantido no grupo" } : log) } : current)
        continue
      }
      if (!item.project?.actions.some((action) => action.id === "dev")) {
        setGroupRun((current) => current ? { ...current, logs: current.logs.map((log) => log.id === item.id ? { ...log, status: "failed", detail: "Sem ação de desenvolvimento declarada" } : log) } : current)
        continue
      }
      try {
        await terminal.openSession(item.id)
        setGroupRun((current) => current ? { ...current, logs: current.logs.map((log) => log.id === item.id ? { ...log, status: "success", detail: "Sessão gerenciada solicitada" } : log) } : current)
      } catch (cause: unknown) {
        setGroupRun((current) => current ? { ...current, logs: current.logs.map((log) => log.id === item.id ? { ...log, status: "failed", detail: cause instanceof Error ? cause.message : "Falha ao iniciar" } : log) } : current)
      }
    }
    if (runId.current === currentRunId) setGroupRun((current) => current ? { ...current, phase: "completed" } : current)
  }

  async function stopGroup() {
    if (!activeGroup) return
    runId.current = null
    const memberIds = new Set(activeGroup.projectIds)
    const activeSessions = terminal.sessions.filter((item) => memberIds.has(item.projectId) && ["starting", "running", "stopping"].includes(item.status))
    await Promise.allSettled(activeSessions.map((item) => terminal.stop(item.id)))
    setGroupRun((current) => current ? { ...current, phase: "stopped", logs: current.logs.map((log) => memberIds.has(log.id) && ["queued", "starting"].includes(log.status) ? { ...log, status: "stopped", detail: "Interrompido pelo operador" } : log) } : current)
    setReportOpen(true)
  }

  return <><section className="project-host-layout"><ProjectLibrary projects={projectHost.projects} selectedId={hostSelected?.id ?? null} loading={projectHost.loading} onSelect={setHostSelectedId} onAdd={() => void projectHost.add()} /><div>{projectHost.error ? <p className="project-alert" role="alert">{projectHost.error}</p> : null}{hostSelected ? <ProjectWorkspace project={hostSelected} /> : <div className="project-host-intro"><span className="section-label">NOVO · PROJECT HOST</span><h2>Traga um projeto para o Control</h2><p>Selecione uma pasta externa para inspecionar com segurança. A execução só acontece após sua revisão.</p></div>}</div></section><main className="apps-layout legacy-apps">
    <aside className="apps-sidebar"><div className="section-label">ECOSSISTEMA / {String(items.length).padStart(2, "0")}</div><h1>APPS</h1><AppGroupPanel groups={groups} activeGroupId={activeGroup?.id ?? "matriz"} projects={projects} workbenchAvailable={workbenchAvailable} onSelect={selectGroup} onCreate={createGroup} onAdd={addToActiveGroup} /><div className="app-list" aria-label={`Apps do grupo ${activeGroup?.name ?? "Matriz"}`}>
      {items.length ? items.map((item, index) => <div className="app-list-item" draggable onDragStart={() => { draggedId.current = item.id }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId.current) reorderActiveGroup(draggedId.current, item.id); draggedId.current = null }} key={item.id}><button className={item.id === selectedId ? "app-select selected" : "app-select"} onClick={() => setSelectedId(item.id)}><i className={`status-dot ${item.workbench ? "exited" : terminal.sessions.some((sessionItem) => sessionItem.projectId === item.id && sessionItem.status === "running") ? "running" : "exited"}`} /><span><strong>{item.name}</strong><small>{item.workbench ? workbenchStoreStatus(workbench!) : `${item.project?.port ? `:${item.project.port}` : "NO PORT"} · ${terminal.sessions.some((sessionItem) => sessionItem.projectId === item.id && sessionItem.status === "running") ? "RUNNING" : "STOPPED"}`}</small></span><b aria-hidden="true">›</b></button><span className="app-order-actions"><button type="button" aria-label={`Mover ${item.name} para cima`} onClick={() => moveActiveItem(item.id, -1)} disabled={index === 0}>↑</button><button type="button" aria-label={`Mover ${item.name} para baixo`} onClick={() => moveActiveItem(item.id, 1)} disabled={index === items.length - 1}>↓</button></span></div>) : <div className="app-group-empty"><span>GRUPO VAZIO</span><p>Adicione projetos para montar uma sequência de trabalho.</p></div>}
    </div>{error ? <p role="alert">{error}</p> : null}</aside>
    <section className="app-stage">{activeGroup ? <header className="app-heading"><div><span className="group-heading-mark">M</span><span><strong>{activeGroup.name}</strong><small>{activeGroup.projectIds.length} apps · sequência controlada</small></span></div><div className="group-actions" aria-label={`Ações do grupo ${activeGroup.name}`}><button className="group-play" type="button" onClick={() => void runGroup()} disabled={!activeGroup.projectIds.length || groupRun?.phase === "running"} aria-label={`Iniciar grupo ${activeGroup.name}`}>▶ <span>{groupRun?.phase === "running" ? "Executando" : "Play"}</span></button><button type="button" onClick={() => void stopGroup()} disabled={!activeGroup.projectIds.length} aria-label={`Parar grupo ${activeGroup.name}`}>■ <span>Parar</span></button><button type="button" onClick={() => setReportOpen((value) => !value)} aria-expanded={reportOpen}>◒ <span>Relatório</span></button></div></header> : <header className="app-heading"><strong>Carregando grupo…</strong></header>}
      {reportOpen && groupRun ? <section className="group-report" aria-label="Relatório da sequência" aria-live="polite"><header><span>RELATÓRIO · {groupRun.groupName.toUpperCase()}</span><b>{groupRun.phase === "running" ? "EM EXECUÇÃO" : groupRun.phase === "stopped" ? "INTERROMPIDO" : "CONCLUÍDO"}</b></header><div className="group-report-list">{groupRun.logs.map((log) => <div className={`group-log ${log.status}`} key={log.id}><i aria-hidden="true">{log.status === "success" ? "✓" : log.status === "failed" ? "!" : log.status === "stopped" ? "×" : "·"}</i><span><strong>{log.name}</strong><small>{log.detail}</small></span><b>{log.status === "success" ? "OK" : log.status === "failed" ? "FALHA" : log.status === "starting" ? "AGORA" : log.status === "stopped" ? "PARADO" : "FILA"}</b></div>)}</div></section> : null}
      {selectedId === "matriz-workbench" && workbench ? <div className="terminal-callout workbench-runtime"><strong aria-hidden="true">WB</strong><h2>{workbench.name}</h2><p>{workbench.installed ? "Aplicativo Windows instalado e verificado." : "Instale o Workbench pela Store para conectá-lo ao Control."}</p><button disabled={!workbench.installed} onClick={() => void storeAction("store.app.open", "matriz-workbench").catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao abrir."))}>Abrir aplicativo instalado</button></div> : selected ? <><header className="app-subheading"><div><i className={`status-dot ${session?.status ?? "exited"}`} /><span><strong>{selected.name}</strong><small>{selectedUrl}</small></span></div><span className="native-badge">WEB NATIVO</span></header><div className="app-tabs"><button className="active">TERMINAL</button><button>PREVIEW</button><button>LOGS</button></div><div className="route-row"><label>ROTA<input value="/" readOnly /></label><label>URL<input value={selectedUrl} readOnly /></label><button disabled={!selected.port} onClick={() => { if (selected.port) window.open(selectedUrl, "_blank", "noopener,noreferrer") }}>Abrir</button></div><div className="quick-actions"><small>AÇÕES RÁPIDAS</small><div><button className="primary" disabled={!selected.actions.some((action) => action.id === "dev")} onClick={() => void terminal.openSession(selected.id).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao iniciar."))}>{session && ["running", "starting"].includes(session.status) ? "Ver processo" : "Iniciar"}</button><button onClick={() => terminal.setOpen(true)}>Terminal</button></div></div><div className="terminal-callout"><strong aria-hidden="true">TERM</strong><h2>{session ? "Processo disponível no terminal global" : "Abrir terminal integrado"}</h2><p>{session ? "Use Ctrl J para acompanhar sem sair desta tela." : "Nova sessão segura no workspace"}</p><button onClick={() => terminal.setOpen(true)}>Abrir terminal</button></div></> : <div className="terminal-callout"><h2>{activeGroup?.projectIds.length ? "Selecione um app do grupo" : "Grupo pronto para receber projetos"}</h2><p>{activeGroup?.projectIds.length ? "A sequência está disponível no botão Play." : "Use Adicionar projeto para começar."}</p></div>}</section>
    <aside className="agent-rail"><header>AGENTE <span>● ONLINE</span></header><StartupPanel />{groupRun ? <p className="agent-run-state">{groupRun.phase === "running" ? `Executando ${groupRun.groupName} em ordem.` : `Último relatório: ${groupRun.logs.filter((log) => log.status === "success").length} positivos · ${groupRun.logs.filter((log) => log.status === "failed").length} falhas.`}</p> : <p>Aguardando atividade operacional.</p>}</aside>
  </main></>
}
