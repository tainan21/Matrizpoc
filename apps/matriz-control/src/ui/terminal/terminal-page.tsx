"use client"

import { useEffect, useState } from "react"
import type { TerminalProject } from "../../domain/terminal"
import { useTerminal } from "./terminal-context"

export function TerminalPage() {
  const terminal = useTerminal()
  const [projects, setProjects] = useState<TerminalProject[]>([])
  useEffect(() => { void fetch("/api/projects").then((response) => response.json()).then((data: { projects: TerminalProject[] }) => setProjects(data.projects)) }, [])
  return <main className="page"><div className="page-title"><span className="section-label">SESSÕES / {String(terminal.sessions.length).padStart(2, "0")}</span><h1>Terminal</h1><p>Controle completo das sessões que também aparecem no dock global.</p></div><div className="terminal-page-grid"><section className="panel"><h2>Nova sessão</h2>{projects.map((project) => <div className="project-row" key={project.id}><span><strong>{project.name}</strong><small>{project.actions.map((item) => item.id).join(" · ")}</small></span>{project.actions.map((action) => <button key={action.id} onClick={() => void terminal.openSession(project.id, action.id)}>{action.label}</button>)}</div>)}</section><section className="panel"><h2>Sessões recentes</h2>{terminal.sessions.length ? terminal.sessions.map((session) => <button className="session-row" key={session.id} onClick={() => { terminal.setActiveSessionId(session.id); terminal.setOpen(true) }}><i className={`status-dot ${session.status}`} /><span><strong>{session.projectName}</strong><small>{session.actionId} · {session.status}</small></span><b>Open ›</b></button>) : <p className="muted">Nenhuma sessão iniciada.</p>}</section></div></main>
}
