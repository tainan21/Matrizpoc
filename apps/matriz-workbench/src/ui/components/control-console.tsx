"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { reviewControlEvidenceAction } from "../../../app/actions"
import type { ControlSnapshot, ControlProjectSnapshot } from "../../application/control-service"

export function ControlPage({ snapshot }: { snapshot: ControlSnapshot }) {
  const [toast, setToast] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "?") setHelpOpen(true)
      if (event.key === "Escape") setHelpOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  const projects = snapshot.projects
  const selected = projects[0]
  const visibleProjects = snapshot.selectedProjectId ? projects.slice(0, 1) : projects
  return (
    <main className="workspace-page control-page">
      <header className="page-header control-header">
        <div><p className="eyebrow">Controle · revisão operacional</p><h1>Visão de controle</h1><p>Uma camada separada do Foco para conferir evidência, saúde e próximos sinais.</p></div>
        <ControlFilters projects={projects} selectedProjectId={snapshot.selectedProjectId} onToast={setToast} />
      </header>
      <ControlSummary snapshot={snapshot} onHelp={() => setHelpOpen(true)} />
      <div className="control-grid">
        <div className="control-main-column">
          {visibleProjects.length ? visibleProjects.map((project) => <ScorecardHealthGrid project={project} key={project.projectId} />) : <EmptyControl />}
          {selected ? <ApprovalQueue project={selected} onToast={setToast} /> : null}
          {visibleProjects.map((project) => <ControlActivityTimeline project={project} key={`activity-${project.projectId}`} />)}
        </div>
        <aside className="control-inspector">
          {selected ? <EntityPresenceList project={selected} /> : null}
          {selected ? <ControlNotificationList project={selected} /> : null}
          {selected ? <SnippetPicker project={selected} onToast={setToast} /> : null}
        </aside>
      </div>
      <ShortcutHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ToastRegion message={toast} onClose={() => setToast(null)} />
    </main>
  )
}

export function ControlSummary({ snapshot, onHelp }: { snapshot: ControlSnapshot; onHelp: () => void }) {
  return <section className="control-summary" aria-label="Resumo do controle">
    <div className="control-score"><span className="score-kicker">Score agregado</span><strong>{snapshot.aggregate}<small>/100</small></strong><span>{snapshot.pendingApprovals} evidências aguardam revisão</span></div>
    <div><strong>{snapshot.projects.length}</strong><span>projetos no recorte</span></div>
    <div><strong>{snapshot.activeEntities}</strong><span>entidades ativas</span></div>
    <div><strong>{snapshot.insights}</strong><span>insights de backlog</span></div>
    <button className="button ghost control-help" type="button" onClick={onHelp} aria-label="Abrir ajuda de atalhos">?</button>
  </section>
}

export function ScorecardHealthGrid({ project }: { project: ControlProjectSnapshot }) {
  return <section className="control-section"><div className="section-heading"><div><span className="score-kicker">Trilhas independentes</span><h2>Saúde do projeto</h2></div><Link href={`/projects/${project.projectId}/roadmap`}>Abrir roadmap →</Link></div><div className="control-score-grid">
    {project.summary.tracks.map((track) => <article className={`control-score-card ${track.score >= 70 ? "good" : track.score >= 35 ? "warn" : "danger"}`} key={track.slug}><div><span>{track.slug}</span><strong>{track.score}<small>/100</small></strong></div><div className="score-bar"><i style={{ width: `${track.score}%` }} /></div><small>{track.approved} aprovadas · {track.pending} pendentes</small></article>)}
  </div></section>
}

export function ApprovalQueue({ project, onToast }: { project: ControlProjectSnapshot; onToast: (message: string) => void }) {
  const pending = project.evidence.filter((item) => item.status === "proposed")
  return <section className="control-section"><div className="section-heading"><div><span className="score-kicker">Gate humano</span><h2>Evidências aguardando revisão</h2></div><span>{pending.length}</span></div>{pending.length ? <div className="control-list">{pending.map((item) => <div className="control-row" key={item.id}><div><strong>{item.claim}</strong><small>{item.scorecardSlug} · {item.goalId} · {item.source}</small></div><form action={reviewControlEvidenceAction} onSubmit={() => onToast("Evidência aprovada e score recalculado.")}><input type="hidden" name="projectId" value={project.projectId} /><input type="hidden" name="evidenceId" value={item.id} /><input type="hidden" name="revision" value={item.revision} /><input type="hidden" name="decision" value="approved" /><button className="button primary icon-button" type="submit" aria-label={`Aprovar ${item.claim}`}>✓ <span>Aprovar</span></button></form></div>)}</div> : <div className="empty-inline"><strong>Fila limpa</strong><span>Propostas do Codex e MCP aparecerão aqui antes de afetar o score.</span></div>}</section>
}

export function EntityPresenceList({ project }: { project: ControlProjectSnapshot }) {
  return <section className="control-section inspector-section"><div className="section-heading"><h2>Entidades</h2><span>{project.entities.length}</span></div>{project.entities.length ? project.entities.map((entity) => <div className="presence-row" key={entity.id}><i className={`presence-dot ${entity.status}`} /><span><strong>{entity.label}</strong><small>{entity.kind} · {entity.status}</small></span></div>) : <p className="muted compact">Nenhuma presença registrada ainda.</p>}</section>
}

export function ControlNotificationList({ project }: { project: ControlProjectSnapshot }) {
  return <section className="control-section inspector-section"><div className="section-heading"><h2>Alertas locais</h2><span>{project.notifications.filter((item) => !item.read).length} novos</span></div>{project.notifications.length ? project.notifications.slice(0, 5).map((item) => <div className="notification-row" key={item.id}><span className={`notification-mark ${item.severity}`} /><div><strong>{item.title}</strong><small>{item.body}</small></div></div>) : <p className="muted compact">Sem notificações internas. O outbox externo continua separado.</p>}</section>
}

export function ControlActivityTimeline({ project }: { project: ControlProjectSnapshot }) {
  return <section className="control-section"><div className="section-heading"><div><span className="score-kicker">Append-only</span><h2>Atividade recente</h2></div><Link href={`/projects/${project.projectId}/activity`}>Ver tudo →</Link></div>{project.activity.length ? <div className="control-timeline">{project.activity.slice(0, 8).map((event) => <div key={event.id}><i /><span><strong>{event.summary}</strong><small>{event.actor} · {new Date(event.occurredAt).toLocaleString("pt-BR")}</small></span></div>)}</div> : <div className="empty-inline"><strong>Sem atividade</strong><span>Eventos de roadmap, backlog e MCP aparecerão aqui.</span></div>}</section>
}

export function ControlFilters({ projects, selectedProjectId, onToast }: { projects: ControlProjectSnapshot[]; selectedProjectId?: string; onToast: (message: string) => void }) {
  const options = useMemo(() => projects.map((project) => ({ id: project.projectId, name: project.displayName })), [projects])
  return <label className="control-filter">Projeto<select value={selectedProjectId ?? ""} onChange={(event) => { const value = event.target.value; onToast("Filtro aplicado."); window.location.href = value ? `/control?project=${encodeURIComponent(value)}` : "/control" }}><option value="">Todos os projetos</option>{options.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
}

export function SnippetPicker({ project, onToast }: { project: ControlProjectSnapshot; onToast: (message: string) => void }) {
  const [query, setQuery] = useState("")
  const snippets = project.snippets.filter((item) => `${item.command} ${item.title}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))
  return <section className="control-section inspector-section"><div className="section-heading"><h2>Snippets</h2><span>/</span></div><input aria-label="Filtrar snippets" placeholder="/contexto-curto" value={query} onChange={(event) => setQuery(event.target.value)} />{snippets.length ? snippets.map((item) => <button className="snippet-row" key={item.id} type="button" onClick={() => { void navigator.clipboard?.writeText(item.content); onToast(`${item.command} copiado.`) }}><code>{item.command}</code><span><strong>{item.title}</strong><small>{item.content.slice(0, 70)}…</small></span></button>) : <p className="muted compact">Crie snippets no workspace para reutilizar contexto.</p>}</section>
}

export function ShortcutHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) { return open ? <div className="command-overlay" role="presentation" onMouseDown={onClose}><div className="command-dialog shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title" onMouseDown={(event) => event.stopPropagation()}><div className="command-dialog-header"><div><strong id="shortcut-title">Atalhos do Controle</strong><span>Fluxo rápido, sempre reversível.</span></div><button type="button" onClick={onClose}>Esc</button></div><div className="shortcut-list"><div><kbd>Ctrl K</kbd><span>Abrir command palette</span></div><div><kbd>G C</kbd><span>Ir para Controle</span></div><div><kbd>G F</kbd><span>Ir para Foco</span></div><div><kbd>?</kbd><span>Abrir esta ajuda</span></div><div><kbd>Esc</kbd><span>Fechar overlays</span></div></div></div></div> : null }

export function ToastRegion({ message, onClose }: { message: string | null; onClose: () => void }) { return message ? <div className="toast-region" role="status"><span>{message}</span><button type="button" aria-label="Fechar notificação" onClick={onClose}>×</button></div> : null }

function EmptyControl() { return <div className="empty-inline"><strong>Nenhum projeto inicializado</strong><span>Inicialize um workspace em Projetos para começar o Controle.</span></div> }
