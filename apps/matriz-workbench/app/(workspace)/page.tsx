import Link from "next/link"
import { WorkspaceRepository } from "../../src/integration/filesystem/workspace-repository"
import {
  toFocusAgentRequestViewModel,
  toFocusWorkItemViewModel,
} from "../../src/ui/presenters/focus-presenter"
import { toProjectNavViewModel } from "../../src/ui/presenters/workspace-presenters"

export default async function FocusPage() {
  const repository = await WorkspaceRepository.create()
  const projects = (await repository.discoverProjects()).map(toProjectNavViewModel)
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
      .map((item) => toFocusWorkItemViewModel({ item, project })),
  )
  const blocked = snapshots.flatMap(({ project, backlog }) =>
    backlog
      .filter((item) => item.status === "blocked")
      .map((item) => toFocusWorkItemViewModel({ item, project })),
  )
  const requests = snapshots.flatMap(({ project, requests: rows }) =>
    rows
      .filter((request) => ["queued", "claimed", "in_progress"].includes(request.status))
      .map((request) => toFocusAgentRequestViewModel({ project, request })),
  )

  return (
    <main className="workspace-page">
      <header className="page-header focus-header">
        <div>
          <p className="eyebrow">Hoje</p>
          <h1>Foco</h1>
          <p>Ativos, bloqueios e agentes em um só lugar.</p>
        </div>
        <Link className="button primary" href="/projects">Projetos</Link>
      </header>
      <div className="workspace-with-inspector">
        <div className="main-column">
          <section className="metric-strip" aria-label="Resumo">
            <div><strong>{active.length}</strong><span>ativos</span></div>
            <div><strong>{blocked.length}</strong><span>bloqueios</span></div>
            <div><strong>{requests.length}</strong><span>agentes</span></div>
            <div><strong>{projects.length}</strong><span>apps</span></div>
          </section>
          <section className="data-section">
            <div className="section-heading"><h2>Em andamento</h2><span>{active.length} itens</span></div>
            {active.length ? (
              <div className="rows">
                {active.slice(0, 8).map((item) => (
                  <Link className="work-row" href={item.href} key={item.id}>
                    <span aria-hidden="true" className={`priority-bar ${item.priority}`} />
                    <span className="sr-only">Prioridade {item.priorityLabel}</span>
                    <span className="row-main">
                      <strong>{item.title}</strong>
                      <small>
                        {item.projectLabel} · <span aria-hidden="true">{item.shortReference}</span>
                        <span className="sr-only">Referência completa {item.fullReference}</span>
                      </small>
                    </span>
                    <span className={`status-chip ${item.status}`}>{item.statusLabel}</span>
                  </Link>
                ))}
              </div>
            ) : <Empty title="Nada em andamento" text="Prepare uma tarefa no backlog de um projeto." />}
          </section>
          <section className="data-section">
            <div className="section-heading"><h2>Bloqueios</h2><span>{blocked.length} itens</span></div>
            {blocked.length ? blocked.map((item) => (
              <Link className="work-row" href={item.href} key={item.id}>
                <span aria-hidden="true" className={`priority-bar ${item.priority}`} />
                <span className="sr-only">Prioridade {item.priorityLabel}</span>
                <span className="row-main">
                  <strong>{item.title}</strong>
                  <small>
                    {item.projectLabel} · <span aria-hidden="true">{item.shortReference}</span>
                    <span className="sr-only">Referência completa {item.fullReference}</span>
                  </small>
                </span>
                <span className={`status-chip ${item.status}`}>{item.statusLabel}</span>
              </Link>
            )) : <Empty title="Sem bloqueios" text="O fluxo está livre para avançar." />}
          </section>
        </div>
        <aside className="inspector">
          <div className="inspector-heading"><span>Agentes</span><strong>{requests.length}</strong></div>
          {requests.length ? requests.slice(0, 8).map((request) => (
            <Link className="agent-line" href={request.href} key={request.id}>
              <span className="agent-avatar">AI</span>
              <span><strong>{request.title}</strong><small>{request.statusLabel} · {request.projectLabel}</small></span>
            </Link>
          )) : <p className="muted compact">Nenhuma solicitação aguardando agente.</p>}
          <div className="inspector-note">
            <span className="live-dot" /> MCP local
            <p>Escritas exigem aprovação humana.</p>
          </div>
        </aside>
      </div>
    </main>
  )
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="empty-inline"><strong>{title}</strong><span>{text}</span></div>
}
