import {
  createAgentTeamHandoffAction,
  createAgentTeamMissionAction,
  createAgentTeamProfileAction,
  initializeAgentTeamAction,
  recordAgentTeamEvidenceAction,
  reviewAgentTeamMissionAction,
  transitionAgentTeamMissionAction,
} from "../../actions"
import { AgentTeamService } from "../../../src/application/agent-team-service"
import { WorkspaceError } from "../../../src/domain/errors"
import { WorkspaceRepository } from "../../../src/integration/filesystem/workspace-repository"
import { toAgentTeamViewModel } from "../../../src/ui/presenters/agent-team-presenter"

const HUMAN_ID_PLACEHOLDER = "human_00000000-0000-4000-8000-000000000000"

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>
}) {
  const { projectId: requestedProjectId } = await searchParams
  const repository = await WorkspaceRepository.create()
  const projects = (await repository.discoverProjects()).filter((project) => !project.corrupted)
  const selectedProject = projects.find((project) => project.id === requestedProjectId)
    ?? projects.find((project) => project.initialized)
    ?? projects[0]

  if (!selectedProject) {
    return <main className="workspace-page"><p>Nenhum projeto local disponível.</p></main>
  }

  const service = new AgentTeamService(repository)
  const team = selectedProject.initialized
    ? await service.getTeam(selectedProject.id).catch((error: unknown) => {
      if (error instanceof WorkspaceError && error.code === "NOT_INITIALIZED") return undefined
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
      throw error
    })
    : undefined

  if (!team) {
    return (
      <main className="workspace-page">
        <TeamHeader projects={projects} projectId={selectedProject.id} />
        <section className="initialize-state">
          <h1>Iniciar equipe local</h1>
          <p>O Workbench criará apenas registros Git-backed em <code>.matriz/agents/**</code>.</p>
          <form action={initializeAgentTeamAction}>
            <input name="projectId" type="hidden" value={selectedProject.id} />
            <button className="button primary" type="submit">Criar perfis locais</button>
          </form>
        </section>
      </main>
    )
  }

  const view = toAgentTeamViewModel(team)

  return (
    <main className="workspace-page">
      <TeamHeader projects={projects} projectId={selectedProject.id} />
      <section className="metric-strip" aria-label="Resumo da equipe">
        <div><strong>{view.profiles.length}</strong><span>perfis locais</span></div>
        <div><strong>{view.missions.length}</strong><span>missões</span></div>
        <div><strong>{view.missions.filter((mission) => mission.needsHumanReview).length}</strong><span>revisões pendentes</span></div>
        <div><strong>{view.missions.reduce((total, mission) => total + mission.evidenceCount, 0)}</strong><span>evidências</span></div>
      </section>

      <section className="data-section">
        <div className="section-heading"><div><p className="eyebrow">Perfis descritivos</p><h2>Baby Nilos</h2></div><span>sem execução automática</span></div>
        <div className="project-list">
          {view.profiles.map((profile) => (
            <article className="project-row" key={profile.id}>
              <div><span className="project-glyph active">{profile.displayName.slice(0, 2).toUpperCase()}</span><span><strong>{profile.displayName}</strong><small>{profile.persona}</small></span></div>
              <span className="project-package"><code>{profile.authorityLabel}</code><small>{profile.capabilities.join(", ") || "sem capabilities declaradas"}</small></span>
            </article>
          ))}
        </div>
        <details className="protocol-note"><summary>Novo perfil</summary><form action={createAgentTeamProfileAction} className="form-grid"><input name="projectId" type="hidden" value={selectedProject.id} /><label>ID<input name="id" pattern="[a-z][a-z0-9.-]{1,79}" required /></label><label>Nome<input name="displayName" required /></label><label>Persona<textarea name="personaSummary" required /></label><label>Missão<textarea name="missionStatement" required /></label><label>Capabilities (uma por linha)<textarea name="capabilityIds" /></label><label>Autoridade<select defaultValue="observe" name="defaultAuthority"><AuthorityOptions /></select></label><label>Responsável humano<input defaultValue="Tai" name="humanOwner" required /></label><button className="button primary" type="submit">Criar perfil</button></form></details>
      </section>

      <section className="data-section">
        <div className="section-heading"><div><p className="eyebrow">Missões delimitadas</p><h2>Trabalho revisável</h2></div><span>fonte: .matriz/agents/**</span></div>
        <div className="project-list">
          {view.missions.map((mission) => (
            <article className="project-row" key={mission.id}>
              <div><span className="project-glyph">M</span><span><strong>{mission.title}</strong><small>{mission.agentName} · {mission.authorityLabel} · {mission.allowedPaths.join(", ")}</small></span></div>
              <span className="project-package"><code>{mission.statusLabel}</code><small>{mission.evidenceCount} evidência(s) · {mission.handoffCount} handoff(s)</small></span>
              <span className={`status-chip ${mission.needsHumanReview ? "review" : "muted-status"}`}><i /> {mission.needsHumanReview ? "revisão humana" : "auditável"}</span>
              <MissionActions mission={mission} projectId={selectedProject.id} />
            </article>
          ))}
          {!view.missions.length ? <div className="empty-inline"><strong>Nenhuma missão registrada</strong><span>Crie uma missão com escopo e critérios para começar.</span></div> : null}
        </div>
        <details className="protocol-note"><summary>Nova missão</summary><form action={createAgentTeamMissionAction} className="form-grid"><input name="projectId" type="hidden" value={selectedProject.id} /><label>Perfil<select name="profileId">{view.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select></label><label>Título<input name="title" required /></label><label>Objetivo<textarea name="objective" required /></label><label>Paths permitidos (um por linha)<textarea name="allowedPaths" required /></label><label>Autoridade<select defaultValue="propose" name="authority"><AuthorityOptions /></select></label><label>Referências de contexto<textarea name="contextReferences" /></label><label>Critérios de aceite<textarea name="acceptanceCriteria" /></label><button className="button primary" type="submit">Criar missão</button></form></details>
      </section>
    </main>
  )
}

function TeamHeader({ projects, projectId }: { projects: readonly { id: string; displayName: string }[]; projectId: string }) {
  return <header className="page-header"><div><p className="eyebrow">Coworking local</p><h1>Equipe</h1><p>Missões, evidências e handoffs continuam no projeto e exigem revisão humana para conclusão.</p></div><form method="get"><label>Projeto<select defaultValue={projectId} name="projectId">{projects.map((project) => <option key={project.id} value={project.id}>{project.displayName}</option>)}</select></label><button className="button" type="submit">Abrir</button></form></header>
}

function AuthorityOptions() {
  return <><option value="observe">Observação</option><option value="propose">Proposta</option><option value="change_scoped">Alteração delimitada</option><option value="execute_approved">Execução aprovada</option></>
}

function MissionActions({ mission, projectId }: { mission: { id: string; revision: string; needsHumanReview: boolean; canRecordArtifacts: boolean; transitionOptions: readonly { value: string; label: string }[] }; projectId: string }) {
  return <details className="protocol-note"><summary>Ações</summary>{mission.transitionOptions.length ? <form action={transitionAgentTeamMissionAction}><input name="projectId" type="hidden" value={projectId} /><input name="missionId" type="hidden" value={mission.id} /><input name="revision" type="hidden" value={mission.revision} /><label>Próximo estado<select name="target">{mission.transitionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button className="button" type="submit">Atualizar</button></form> : null}{mission.canRecordArtifacts ? <><form action={recordAgentTeamEvidenceAction}><input name="projectId" type="hidden" value={projectId} /><input name="missionId" type="hidden" value={mission.id} /><input name="revision" type="hidden" value={mission.revision} /><label>Tipo<select name="kind"><option value="note">Nota</option><option value="file">Arquivo</option><option value="test">Teste</option><option value="url">URL</option></select></label><label>Resumo<input name="summary" required /></label><label>Registrada por<input name="recordedBy" required /></label><label>Referência<textarea name="reference" required /></label><button className="button" type="submit">Registrar evidência</button></form><form action={createAgentTeamHandoffAction}><input name="projectId" type="hidden" value={projectId} /><input name="missionId" type="hidden" value={mission.id} /><input name="revision" type="hidden" value={mission.revision} /><label>Resumo<textarea name="contextSummary" required /></label><label>Decisões<textarea name="decisions" /></label><label>Riscos<textarea name="risks" /></label><label>Próximo passo<input name="nextStep" required /></label><label>Revisor humano<input name="reviewerId" pattern="human_[0-9a-f-]{36}" placeholder={HUMAN_ID_PLACEHOLDER} required /></label><button className="button" type="submit">Registrar handoff</button></form></> : null}{mission.needsHumanReview ? <form action={reviewAgentTeamMissionAction}><input name="projectId" type="hidden" value={projectId} /><input name="missionId" type="hidden" value={mission.id} /><input name="revision" type="hidden" value={mission.revision} /><label>Decisão<select name="decision"><option value="approved">Aprovar</option><option value="changes_requested">Pedir alterações</option></select></label><label>Revisor humano<input name="reviewerId" pattern="human_[0-9a-f-]{36}" placeholder={HUMAN_ID_PLACEHOLDER} required /></label><label>Nota<textarea name="note" required /></label><button className="button primary" type="submit">Registrar revisão</button></form> : null}</details>
}
