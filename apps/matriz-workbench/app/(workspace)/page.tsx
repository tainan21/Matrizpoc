import Link from "next/link"
import { WorkspaceRepository } from "../../src/integration/filesystem/workspace-repository"

export default async function FocusPage() {
  const repository = await WorkspaceRepository.create()
  const projects = await repository.discoverProjects()
  const initialized = projects.filter((project) => project.initialized && !project.corrupted)
  const snapshots = await Promise.all(
    initialized.map(async (project) => {
      const [backlog, requests] = await Promise.all([
        repository.listBacklog(project.id),
        repository.listAgentRequests(project.id),
      ])
      return { project, backlog, requests }
    }),
  )
  const active = snapshots.flatMap(({ project, backlog }) =>
    backlog
      .filter((item) => ["ready", "in_progress", "review"].includes(item.status))
      .map((item) => ({ project, item })),
  )
  const blocked = snapshots.flatMap(({ project, backlog }) =>
    backlog.filter((item) => item.status === "blocked").map((item) => ({ project, item })),
  )
  const requests = snapshots.flatMap(({ project, requests: rows }) =>
    rows
      .filter((request) => ["queued", "claimed", "in_progress"].includes(request.status))
      .map((request) => ({ project, request })),
  )

  return (
    <main className="workspace-page">
      <header className="page-header focus-header">
        <div>
          <p className="eyebrow">Hoje · coworking local</p>
          <h1>Foco atual</h1>
          <p>O que está em movimento, o que bloqueia e o que aguarda um agente.</p>
        </div>
        <Link className="button primary" href="/projects">Abrir projetos</Link>
      </header>
      <div className="workspace-with-inspector">
        <div className="main-column">
          <section className="metric-strip" aria-label="Resumo">
            <div><strong>{active.length}</strong><span>em andamento</span></div>
            <div><strong>{blocked.length}</strong><span>bloqueios</span></div>
            <div><strong>{requests.length}</strong><span>na fila de agentes</span></div>
            <div><strong>{projects.length}</strong><span>apps detectados</span></div>
          </section>
          <section className="data-section">
            <div className="section-heading"><h2>Trabalho ativo</h2><span>{active.length} itens</span></div>
            {active.length ? (
              <div className="rows">
                {active.slice(0, 8).map(({ project, item }) => (
                  <Link className="work-row" href={`/projects/${project.id}/backlog/${item.id}`} key={item.id}>
                    <span className={`priority-bar ${item.priority}`} />
                    <span className="row-main"><strong>{item.title}</strong><small>{project.displayName} · {item.id}</small></span>
                    <span className={`status-chip ${item.status}`}>{item.status.replace("_", " ")}</span>
                  </Link>
                ))}
              </div>
            ) : <Empty title="Nada em andamento" text="Prepare uma tarefa no backlog de um projeto." />}
          </section>
          <section className="data-section">
            <div className="section-heading"><h2>Bloqueios</h2><span>{blocked.length} itens</span></div>
            {blocked.length ? blocked.map(({ project, item }) => (
              <Link className="work-row" href={`/projects/${project.id}/backlog/${item.id}`} key={item.id}>
                <span className="danger">!</span>
                <span className="row-main"><strong>{item.title}</strong><small>{project.displayName}</small></span>
                <span className="status-chip blocked">bloqueada</span>
              </Link>
            )) : <Empty title="Sem bloqueios" text="O fluxo está livre para avançar." />}
          </section>
        </div>
        <aside className="inspector">
          <div className="inspector-heading"><span>Fila de agentes</span><strong>{requests.length}</strong></div>
          {requests.length ? requests.slice(0, 8).map(({ project, request }) => (
            <Link className="agent-line" href={`/projects/${project.id}/agents#${request.id}`} key={request.id}>
              <span className="agent-avatar">AI</span>
              <span><strong>{request.title}</strong><small>{request.status} · {project.displayName}</small></span>
            </Link>
          )) : <p className="muted compact">Nenhuma solicitação aguardando agente.</p>}
          <div className="inspector-note">
            <span className="live-dot" /> MCP local
            <p>Contexto compacto, leitura seletiva e aprovação humana para qualquer escrita.</p>
          </div>
        </aside>
      </div>
    </main>
  )
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty-inline"><strong>{title}</strong><span>{text}</span></div>
}
