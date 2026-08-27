"use client"

import type { ProjectViewModel } from "../../modules/projects/presentation/project-presenter"
import { AddProjectWizard } from "./add-project-wizard"
import { useProjectHost } from "./project-host-context"

const problemCopy: Partial<Record<ProjectViewModel["state"], string>> = { blocked: "Conflito de configuração ou porta. Revise o diagnóstico antes de tentar novamente.", degraded: "A prontidão expirou ou a superfície respondeu de forma incompatível.", failed: "O processo encerrou antes de ficar pronto.", needs_review: "A receita mudou e precisa de uma nova aprovação." }

export function ProjectWorkspace({ project }: { project: ProjectViewModel }) {
  const host = useProjectHost(); const busy = host.busy === project.id
  const active = project.sessions.at(-1)
  return <section className="project-workspace"><header className="project-heading"><div><span className="section-label">{project.stackLabel}</span><h2>{project.name}</h2><p>{project.trustLabel} · {project.stateLabel}</p></div><span className={`project-state ${project.attention}`}>{project.stateLabel}</span></header>
    {problemCopy[project.state] || project.reconciliationReason ? <p className="project-alert" role="alert">{project.reconciliationReason ?? problemCopy[project.state]}</p> : null}
    <AddProjectWizard project={project} preview={host.preview} busy={busy} onInspect={() => void host.inspect(project.id)} onApprove={() => void host.approve(project.id, project.recipeRevision)} onPreview={() => void host.previewPreparation(project.id, project.recipeRevision)} onPrepare={() => void host.prepare(project.id, project.recipeRevision)} />
    <div className="project-actions"><span className="section-label">AÇÕES APROVADAS</span>{project.runActions.map((action) => <article key={action.id}><div><strong>{action.label}</strong><small>{action.readinessLabel} · portas {action.ports.join(", ") || "automáticas"}</small></div><button className="primary" disabled={busy || !["ready", "stopped", "failed", "degraded"].includes(project.state)} onClick={() => void host.start(project.id, action.id, project.recipeRevision)}>Iniciar</button></article>)}</div>
    {active ? <div className="project-session"><span><i className={`status-dot ${active.state}`} /><strong>Sessão {active.state}</strong><small>{active.result ?? `PID ${active.pid ?? "aguardando"}`}</small></span><div>{active.state === "running" ? <button onClick={() => void host.stop(project.id, active.id)}>Parar</button> : <button onClick={() => void host.restart(project.id, active.id)}>Reiniciar</button>}{project.surfaces.map((surface) => <button key={surface.id} disabled={project.state !== "running"} onClick={() => void host.open(project.id, surface.id)}>Abrir {surface.label}</button>)}</div></div> : null}
    <footer><button className="danger-link" onClick={() => void host.remove(project.id)}>Remover do catálogo</button><small>Os arquivos do projeto não serão excluídos.</small></footer>
  </section>
}
