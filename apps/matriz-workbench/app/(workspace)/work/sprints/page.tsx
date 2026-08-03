import Link from "next/link"
import { createSprintAction } from "../../../actions"
import { WorkspaceRepository } from "../../../../src/integration/filesystem/workspace-repository"
import { toSprintViewModel } from "../../../../src/ui/presenters/adaptive-work-presenter"

export default async function SprintsPage() {
  const repository = await WorkspaceRepository.create()
  const [sprints, projects] = await Promise.all([repository.listSprints(), repository.discoverProjects()])
  const initialized = projects.filter((project) => project.initialized && !project.corrupted)
  const work = (await Promise.all(initialized.map((project) => repository.listWorkItems(project.id)))).flat()
  const requests = (await Promise.all(initialized.map((project) => repository.listAgentRequests(project.id)))).flat()
  const viewModels = sprints.map((sprint) => toSprintViewModel(sprint, work, requests))
  return (
    <>
      <header className="page-header compact-header"><div><p className="eyebrow">Compromisso e validação</p><h1>Sprints</h1><p>Tempo, intenção e decisões de outcome — sem confundir execução concluída com produto validado.</p></div></header>
      <div className="sprint-layout">
        <section className="sprint-list">
          {viewModels.map((sprint) => (
            <Link className="sprint-card" href={sprint.href} key={sprint.id}>
              <header><span className={`status-chip ${sprint.status}`}><i />{sprint.status}</span><small>{sprint.periodLabel}</small></header>
              <h2>{sprint.name}</h2><p>{sprint.intent}</p>
              <div className="sprint-operational-line"><span><strong>{sprint.validatedOutcomes}/{sprint.outcomeCount}</strong> outcomes</span><span><strong>{sprint.wipLabel}</strong> WIP</span><span><strong>{sprint.reviewCount}</strong> review</span><span><strong>{sprint.validationCount}</strong> validação</span></div>
            </Link>
          ))}
          {!viewModels.length ? <div className="empty-state"><strong>Nenhuma sprint planejada.</strong><span>Crie o primeiro compromisso com uma intenção verificável.</span></div> : null}
        </section>
        <aside className="adaptive-inspector sprint-creator">
          <div className="inspector-heading">Nova sprint</div>
          <h2>Defina primeiro a intenção</h2><p className="adaptive-lede">Outcomes e trabalho entram depois, dentro do contexto da sprint.</p>
          <form action={createSprintAction} className="adaptive-form">
            <label>Nome<input name="name" placeholder="Sprint adaptativa 01" required /></label>
            <label>Sprint Intent<textarea name="intent" placeholder="Que mudança verificável queremos validar?" required rows={4} /></label>
            <div className="form-grid"><label>Início<input name="startDate" required type="date" /></label><label>Fim<input name="endDate" required type="date" /></label><label>WIP máximo<input defaultValue="4" max="100" min="1" name="wipLimit" type="number" /></label><label>Confiança<select defaultValue="" name="confidence"><option value="">Não informar</option><option value="1">1 — baixa</option><option value="2">2</option><option value="3">3 — média</option><option value="4">4</option><option value="5">5 — alta</option></select></label></div>
            <label>Justificativa da confiança<textarea name="confidenceRationale" rows={2} /></label><label>Riscos, um por linha<textarea name="risks" rows={3} /></label>
            <button className="button primary" type="submit">Criar em planejamento</button>
          </form>
        </aside>
      </div>
    </>
  )
}
