import Link from "next/link"
import { SiteCatalogBridge } from "../../../src/integration/sites/site-catalog-bridge"
import { WorkspaceRepository } from "../../../src/integration/filesystem/workspace-repository"

export default async function SitesPage() {
  const repository = await WorkspaceRepository.create()
  const bridge = await SiteCatalogBridge.create(repository.repositoryRoot)
  const sites = await bridge.listSites()
  return (
    <main className="workspace-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Matriz Sites</p>
          <h1>Sites</h1>
          <p>Catálogo operacional, metadata e backlog por unidade.</p>
        </div>
        <a className="button ghost" href="http://127.0.0.1:3006" target="_blank" rel="noreferrer">
          Abrir runtime
        </a>
      </header>
      <section className="project-list">
        <div className="table-head">
          <span>Site</span><span>Metadata</span><span>Idiomas</span><span>Ações</span>
        </div>
        {sites.map((site) => (
          <article className="project-row" key={site.id}>
            <div>
              <span className="project-glyph active">{site.name.slice(0, 2).toUpperCase()}</span>
              <span><strong>{site.name}</strong><small>{site.status} · {site.presetId}</small></span>
            </div>
            <span className="project-package">
              <strong>{site.metadataCompleteness.completed}/{site.metadataCompleteness.total}</strong>
              <small>{site.metadataCompleteness.missing.join(", ") || "metadata essencial completa"}</small>
            </span>
            <span>{site.locales.join(" · ")}</span>
            <span className="row-actions">
              <Link className="button ghost" href={`/projects/sites/backlog?site=${site.id}`}>Backlog</Link>
              <a className="button ghost" href={`http://127.0.0.1:3006/preview/${site.id}/${site.defaultLocale}`} target="_blank" rel="noreferrer">Preview</a>
            </span>
          </article>
        ))}
      </section>
    </main>
  )
}
