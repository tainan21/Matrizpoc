import Link from "next/link"
import { buildProjectInventories } from "../../../src/application/project-inventory"
import { FederatedSourceRepository } from "../../../src/integration/filesystem/federated-source-repository"
import { WorkspaceRepository } from "../../../src/integration/filesystem/workspace-repository"
import { initializeProjectAction } from "../../actions"

export default async function ProjectsPage() {
  const repository = await WorkspaceRepository.create()
  const inventory = await buildProjectInventories(repository)
  const federated = await FederatedSourceRepository.create(
    repository.repositoryRoot,
  )
  const externalSources = await federated.listSources()
  const initialized = inventory.filter((item) => item.project.initialized).length
  const repositoryInfo = inventory[0]?.git
  return (
    <main className="workspace-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Descoberta automática</p>
          <h1>Projetos</h1>
          <p>{inventory.length} pastas válidas em <code>apps/*</code>, sem executar TypeScript externo.</p>
        </div>
        <Link className="button primary" href="/projects/new">Planejar projeto</Link>
      </header>
      <section className="inventory-summary" aria-label="Resumo do ecossistema">
        <div><strong>{inventory.length}</strong><span>apps detectados</span></div>
        <div><strong>{initialized}</strong><span>workspaces ativos</span></div>
        <div><strong>{externalSources.length}</strong><span>fontes externas</span></div>
        <div><strong>{repositoryInfo?.branch ?? "—"}</strong><span>branch Git local</span></div>
      </section>
      <section className="project-list">
        <div className="table-head"><span>Projeto</span><span>Package</span><span>Workspace</span><span>Ação</span></div>
        {inventory.map(({ project, local, vercel }) => (
          <article className="project-row" key={project.id}>
            <div>
              <span className={`project-glyph ${project.initialized ? "active" : ""}`}>
                {project.name.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{project.name}</strong>
                <small>{project.relativePath} · {local.folders.length} pastas</small>
              </span>
            </div>
            <span className="project-package">
              <code>{project.packageName}</code>
              <small>
                {local.technologies.join(" · ") || "stack não identificada"}
                {" · "}
                {vercel.configured ? `Vercel: ${vercel.projectName ?? vercel.scope}` : "Vercel não mapeado"}
              </small>
            </span>
            <span className={`status-chip ${project.corrupted ? "blocked" : project.initialized ? "success" : "muted-status"}`}>
              <i /> {project.corrupted ? "corrompido" : project.initialized ? "inicializado" : "não inicializado"}
            </span>
            {project.initialized ? (
              <Link className="button ghost" href={`/projects/${project.id}`}>Abrir</Link>
            ) : (
              <form action={initializeProjectAction}>
                <input type="hidden" name="projectId" value={project.id} />
                <button className="button ghost" type="submit">Inicializar</button>
              </form>
            )}
          </article>
        ))}
      </section>
      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Portfólio federado</p>
            <h2>Repositórios externos</h2>
          </div>
          <Link className="button ghost" href="/knowledge">
            Abrir conhecimento
          </Link>
        </div>
        <div className="project-list">
          <div className="table-head">
            <span>Projeto</span><span>Tipo</span><span>Binding</span><span>Ação</span>
          </div>
          {externalSources.map((source) => (
            <article className="project-row" key={source.id}>
              <div>
                <span className={`project-glyph ${source.available ? "active" : ""}`}>
                  {source.name.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <strong>{source.name}</strong>
                  <small>{source.id}</small>
                </span>
              </div>
              <span className="project-package">
                <code>{source.kind}</code>
                <small>{source.gitRemote ?? "sem remoto registrado"}</small>
              </span>
              <span className={`status-chip ${source.available ? "success" : "muted-status"}`}>
                <i /> {source.available ? "read-only local" : "não configurado"}
              </span>
              {source.available ? (
                <Link className="button ghost" href={`/knowledge/${source.id}`}>
                  Explorar
                </Link>
              ) : <span>—</span>}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
