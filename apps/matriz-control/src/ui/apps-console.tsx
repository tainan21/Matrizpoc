"use client"

import { useEffect, useState } from "react"
import type { TerminalProject } from "../domain/terminal"
import { useTerminal } from "./terminal/terminal-context"

export function AppsConsole() {
  const [projects, setProjects] = useState<TerminalProject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const terminal = useTerminal()
  useEffect(() => { void fetch("/api/projects").then((response) => response.json()).then((data: { projects: TerminalProject[] }) => { setProjects(data.projects); setSelectedId(data.projects[0]?.id ?? null) }).catch(() => setError("Não foi possível ler os projetos.")) }, [])
  const selected = projects.find((project) => project.id === selectedId) ?? null
  const session = terminal.sessions.find((item) => item.projectId === selectedId && item.actionId === "dev")
  const selectedUrl = selected?.port ? `http://localhost:${selected.port}/` : "URL não declarada"
  return <main className="apps-layout">
    <aside className="apps-sidebar"><div className="section-label">ECOSSISTEMA / {String(projects.length).padStart(2, "0")}</div><h1>APPS</h1><div className="app-list">{projects.map((project) => <button className={project.id === selectedId ? "selected" : ""} key={project.id} onClick={() => setSelectedId(project.id)}><i className={`status-dot ${terminal.sessions.some((item) => item.projectId === project.id && item.status === "running") ? "running" : "exited"}`} /><span><strong>{project.name}</strong><small>{project.port ? `:${project.port}` : "NO PORT"} · {terminal.sessions.some((item) => item.projectId === project.id && item.status === "running") ? "RUNNING" : "STOPPED"}</small></span><b aria-hidden="true">›</b></button>)}</div>{error ? <p role="alert">{error}</p> : null}</aside>
    <section className="app-stage">{selected ? <><header className="app-heading"><div><i className={`status-dot ${session?.status ?? "exited"}`} /><span><strong>{selected.name}</strong><small>{selectedUrl}</small></span></div><span className="native-badge">WEB NATIVO</span></header><div className="app-tabs"><button className="active">TERMINAL</button><button>PREVIEW</button><button>LOGS</button></div><div className="route-row"><label>ROTA<input value="/" readOnly /></label><label>URL<input value={selectedUrl} readOnly /></label><button disabled={!selected.port} onClick={() => { if (selected.port) window.open(selectedUrl, "_blank", "noopener,noreferrer") }}>Abrir</button></div><div className="quick-actions"><small>AÇÕES RÁPIDAS</small><div><button className="primary" disabled={!selected.actions.some((action) => action.id === "dev")} onClick={() => void terminal.openSession(selected.id).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Falha ao iniciar."))}>{session && ["running", "starting"].includes(session.status) ? "Ver processo" : "Iniciar"}</button><button onClick={() => terminal.setOpen(true)}>Terminal</button></div></div><div className="terminal-callout"><strong aria-hidden="true">TERM</strong><h2>{session ? "Processo disponível no terminal global" : "Abrir terminal integrado"}</h2><p>{session ? "Use Ctrl J para acompanhar sem sair desta tela." : "Nova sessão segura no workspace"}</p><button onClick={() => terminal.setOpen(true)}>Abrir terminal</button></div></> : <div className="terminal-callout"><h2>Carregando ecossistema…</h2></div>}</section>
    <aside className="agent-rail"><header>AGENTE <span>● ONLINE</span></header><p>Aguardando atividade operacional.</p></aside>
  </main>
}
