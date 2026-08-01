import Link from "next/link"
import { notFound } from "next/navigation"
import { getProjectInventory } from "../../../../src/application/project-inventory"
import { WorkspaceRepository } from "../../../../src/integration/filesystem/workspace-repository"
import { ProjectHeader } from "../../../../src/ui/components/project-header"
import { toProjectSummaryViewModel } from "../../../../src/ui/presenters/workspace-presenters"
import { initializeProjectAction } from "../../../actions"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const repository = await WorkspaceRepository.create()
  const discovered = await repository.getProject(projectId).catch(() => null)
  if (!discovered) notFound()
  if (!discovered.initialized || !discovered.workspace) {
    return (
      <main className="workspace-page">
        <header className="page-header">
          <div><p className="eyebrow">apps/{projectId}</p><h1>{discovered.displayName}</h1><p>Este app foi detectado, mas ainda não possui um workspace Matriz.</p></div>
        </header>
        <section className="initialize-state">
          <span className="project-glyph large">{discovered.displayName.slice(0, 2).toUpperCase()}</span>
          <h2>Inicializar sem tocar no código</h2>
          <p>Serão criados apenas arquivos em <code>apps/{projectId}/.matriz/**</code>.</p>
          <dl className="project-facts centered">
            <div><dt>Package</dt><dd>{discovered.packageName}</dd></div>
            <div><dt>Stack</dt><dd>{discovered.technologies.join(", ") || "não identificada"}</dd></div>
            <div><dt>Pastas</dt><dd>{discovered.topLevelFolders.join(", ") || "nenhuma"}</dd></div>
          </dl>
          <form action={initializeProjectAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <button className="button primary" type="submit">Inicializar workspace</button>
          </form>
        </section>
      </main>
    )
  }
  const [backlog, requests, roadmap, activity, inventory] = await Promise.all([
    repository.listBacklog(projectId),
    repository.listAgentRequests(projectId),
    repository.getRoadmap(projectId),
    repository.listActivity(projectId, undefined, 8),
    getProjectInventory(repository, projectId),
  ])
  const vm = toProjectSummaryViewModel(discovered.workspace, backlog, requests, roadmap)
  return (
    <main className="workspace-page">
      <ProjectHeader projectId={projectId} name={vm.project.displayName} description={vm.project.description} />
      <div className="workspace-with-inspector">
        <div className="main-column">
          <section className="metric-strip">
            <div><strong>{vm.activeTasks}</strong><span>ativas</span></div>
            <div><strong>{vm.blockedTasks}</strong><span>bloqueadas</span></div>
            <div><strong>{vm.queuedRequests}</strong><span>na fila</span></div>
            <div><strong>{vm.roadmapProgress}</strong><span>pontos de 100</span></div>
          </section>
          <section className="data-section">
            <div className="section-heading"><h2>Próximo trabalho</h2><Link href={`/projects/${projectId}/backlog`}>Ver backlog →</Link></div>
            {backlog.filter((item) => item.status !== "archived").slice(0, 6).map((item) => (
              <Link className="work-row" href={`/projects/${projectId}/backlog/${item.id}`} key={item.id}>
                <span className={`priority-bar ${item.priority}`} />
                <span className="row-main"><strong>{item.title}</strong><small>{item.id}</small></span>
                <span className={`status-chip ${item.status}`}>{item.status.replace("_", " ")}</span>
              </Link>
            ))}
            {!backlog.length ? <div className="empty-inline"><strong>Backlog vazio</strong><span>Crie a primeira tarefa para orientar o trabalho.</span><Link href={`/projects/${projectId}/backlog`}>Criar tarefa</Link></div> : null}
          </section>
        </div>
        <aside className="inspector">
          <div className="inspector-heading"><span>Estrutura</span><code>{discovered.relativePath}</code></div>
          <dl className="project-facts">
            <div><dt>Package</dt><dd>{discovered.packageName}</dd></div>
            <div><dt>Stack</dt><dd>{discovered.technologies.join(", ") || "não identificada"}</dd></div>
            <div><dt>Scripts</dt><dd>{discovered.scripts.join(", ") || "nenhum"}</dd></div>
            <div><dt>Pastas</dt><dd>{discovered.topLevelFolders.join(", ") || "nenhuma"}</dd></div>
            <div><dt>Contexto</dt><dd>{discovered.hasAgentInstructions ? "AGENTS.md presente" : "AGENTS.md ausente"}</dd></div>
            <div><dt>Git</dt><dd>{inventory.git.branch ?? "não detectado"}{inventory.git.repository ? ` · ${inventory.git.repository}` : ""}</dd></div>
            <div><dt>Vercel</dt><dd>{inventory.vercel.configured ? inventory.vercel.projectName ?? inventory.vercel.scope : "não mapeado"}</dd></div>
          </dl>
          <hr />
          <div className="inspector-heading"><span>Atividade recente</span><Link href={`/projects/${projectId}/activity`}>tudo</Link></div>
          <div className="timeline">
            {activity.map((event) => (
              <div key={event.id}><i /><span><strong>{event.summary}</strong><small>{event.actor} · {new Date(event.occurredAt).toLocaleString("pt-BR")}</small></span></div>
            ))}
          </div>
          {!activity.length ? <p className="muted compact">Nenhuma atividade registrada.</p> : null}
        </aside>
      </div>
    </main>
  )
}
