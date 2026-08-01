import { notFound } from "next/navigation"
import { WorkspaceRepository } from "../../../../../src/integration/filesystem/workspace-repository"
import { ProjectHeader } from "../../../../../src/ui/components/project-header"
import {
  RoadmapScorecard,
  RoadmapScorecardCollection,
} from "../../../../../src/ui/components/roadmap-scorecard"
import {
  addRoadmapInitiativeAction,
  addRoadmapPhaseAction,
  advanceRoadmapInitiativeAction,
} from "../../../../actions"

export default async function RoadmapPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const repository = await WorkspaceRepository.create()
  const project = await repository.getProject(projectId)
  if (!project.workspace) notFound()
  const roadmap = await repository.getRoadmap(projectId)
  return (
    <main className="workspace-page">
      <ProjectHeader projectId={projectId} name={project.workspace.displayName} description="Fases orientadas a outcomes, não a listas de features." />
      <RoadmapScorecard projectId={projectId} roadmap={roadmap} />
      <RoadmapScorecardCollection projectId={projectId} roadmap={roadmap} />
      <section className="roadmap-track">
        {roadmap.phases.map((phase, index) => (
          <article className={`roadmap-phase ${phase.status}`} key={phase.id}>
            <header><span>Fase {index + 1}</span><span className={`status-chip ${phase.status}`}>{phase.status}</span></header>
            <h2>{phase.title}</h2>
            <p>{phase.outcome || "Outcome ainda não definido."}</p>
            <div className="phase-progress"><i style={{ width: `${phase.initiatives.length ? Math.round(phase.initiatives.filter((item) => item.status === "completed").length / phase.initiatives.length * 100) : 0}%` }} /></div>
            <small>{phase.initiatives.length} iniciativas</small>
            {phase.initiatives.map((initiative) => (
              <form action={advanceRoadmapInitiativeAction} className="initiative-line" key={initiative.id}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="phaseId" value={phase.id} />
                <input type="hidden" name="initiativeId" value={initiative.id} />
                <input type="hidden" name="revision" value={roadmap.revision} />
                <i className={initiative.status} />
                <button disabled={initiative.status === "completed"} type="submit">
                  <strong>{initiative.title}</strong>
                  <small>{initiative.outcome || initiative.status}</small>
                </button>
              </form>
            ))}
          </article>
        ))}
        {!roadmap.phases.length ? <div className="empty-phase"><span>01</span><strong>Defina a direção</strong><p>Comece pela transformação desejada, não pela solução.</p></div> : null}
      </section>
      {roadmap.phases.length ? (
        <details className="composer">
          <summary>Adicionar iniciativa</summary>
          <form action={addRoadmapInitiativeAction} className="form-grid">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="revision" value={roadmap.revision} />
            <label>Fase<select name="phaseId">{roadmap.phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.title}</option>)}</select></label>
            <label>Título<input name="title" required maxLength={160} /></label>
            <label className="wide">Outcome<textarea name="outcome" rows={3} maxLength={500} /></label>
            <label className="wide">IDs do backlog <small>um por linha</small><textarea name="backlogIds" rows={3} /></label>
            <div className="form-actions wide"><button className="button primary" type="submit">Adicionar iniciativa</button></div>
          </form>
        </details>
      ) : null}
      <details className="composer" open={!roadmap.phases.length}>
        <summary>Adicionar fase</summary>
        <form action={addRoadmapPhaseAction} className="form-grid">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="revision" value={roadmap.revision} />
          <label>Título<input name="title" required maxLength={120} placeholder="Ex.: Fundamentos operacionais" /></label>
          <label className="wide">Outcome<textarea name="outcome" rows={3} maxLength={500} placeholder="Qual mudança observável encerra esta fase?" /></label>
          <div className="form-actions wide"><button className="button primary" type="submit">Adicionar fase</button></div>
        </form>
      </details>
    </main>
  )
}
