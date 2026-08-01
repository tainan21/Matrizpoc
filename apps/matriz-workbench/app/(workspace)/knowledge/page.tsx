import Link from "next/link"
import { FederatedSourceRepository } from "../../../src/integration/filesystem/federated-source-repository"
import { WorkspaceRepository } from "../../../src/integration/filesystem/workspace-repository"

export default async function KnowledgePage() {
  const workspace = await WorkspaceRepository.create()
  const repository = await FederatedSourceRepository.create(
    workspace.repositoryRoot,
  )
  const sources = await repository.listSources()
  return (
    <main className="workspace-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Portfólio federado</p>
          <h1>Conhecimento</h1>
          <p>
            Documentos permanecem nos repositórios de origem e são carregados
            somente quando selecionados.
          </p>
        </div>
      </header>
      <section className="project-list">
        <div className="table-head">
          <span>Fonte</span><span>Tipo</span><span>Estado</span><span>Ação</span>
        </div>
        {sources.map((source) => (
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
              <i /> {source.available ? "read-only local" : "sem binding local"}
            </span>
            {source.available ? (
              <Link className="button ghost" href={`/knowledge/${source.id}`}>
                Explorar
              </Link>
            ) : <span>—</span>}
          </article>
        ))}
      </section>
    </main>
  )
}
