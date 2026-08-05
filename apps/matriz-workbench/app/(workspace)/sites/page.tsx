import type { CSSProperties } from "react"
import Link from "next/link"
import { SiteCatalogBridge } from "../../../src/integration/sites/site-catalog-bridge"
import { WorkspaceRepository } from "../../../src/integration/filesystem/workspace-repository"
import { InfoHint } from "../../../src/ui/components/info-hint"
import { toSiteCatalogItemViewModel } from "../../../src/ui/presenters/site-catalog-presenter"
import styles from "./sites-page.module.css"

export default async function SitesPage() {
  const repository = await WorkspaceRepository.create()
  const bridge = await SiteCatalogBridge.create(repository.repositoryRoot)
  const sites = (await bridge.listSites()).map(toSiteCatalogItemViewModel)
  const activeSites = sites.filter((site) => site.status === "active").length
  const metadataCompleted = sites.reduce((total, site) => total + site.metadataCompleteness.completed, 0)
  const metadataTotal = sites.reduce((total, site) => total + site.metadataCompleteness.total, 0)
  const metadataProgress = metadataTotal ? Math.round((metadataCompleted / metadataTotal) * 100) : 0

  return (
    <main className="workspace-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Comunicação · Matriz Sites</p>
          <h1>Sites</h1>
          <p>Catálogo, publicação e pendências essenciais por site.</p>
        </div>
        <div className={styles.headerActions}>
          <InfoHint label="Como o catálogo Sites se integra">
            Projeção app-local pelo SiteCatalogBridge, a partir dos arquivos públicos de site. O Workbench não importa domínio nem componentes internos do app.
          </InfoHint>
          <a className="button ghost" href="http://127.0.0.1:3006" target="_blank" rel="noreferrer">
            Abrir runtime
          </a>
        </div>
      </header>

      <section className={styles.catalog} aria-labelledby="sites-heading">
        <div className={styles.summary} aria-label="Resumo do catálogo">
          <div><strong>{sites.length}</strong><span>sites no catálogo</span></div>
          <div><strong>{activeSites}</strong><span>ativos agora</span></div>
          <div><strong>{metadataProgress}%</strong><span>dos dados essenciais completos</span></div>
        </div>

        <div className={styles.heading}>
          <h2 id="sites-heading">Publicações</h2>
          <span>{sites.length === 1 ? "1 unidade" : `${sites.length} unidades`}</span>
        </div>

        <div className={styles.list}>
          {!sites.length ? (
            <div className={styles.empty}>
              <strong>Nenhum site publicado</strong>
              <span>Adicione um site ao catálogo do Matriz Sites para acompanhar a publicação aqui.</span>
            </div>
          ) : null}
          {sites.map((site) => (
            <article aria-labelledby={`site-${site.id}`} className={styles.site} key={site.id}>
              <div className={styles.identity}>
                <span className={styles.mark} aria-hidden="true">{site.shortLabel}</span>
                <div>
                  <h3 id={`site-${site.id}`}>{site.name}</h3>
                  <small>{site.presetId}</small>
                  <span className={styles.status}>{site.statusLabel}</span>
                </div>
              </div>

              <div className={styles.metadata}>
                <div className={styles.metadataHead}>
                  <strong>{site.completionLabel}</strong>
                  <span>{site.completion}%</span>
                </div>
                <div
                  aria-label="Dados essenciais completos"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={site.completion}
                  className={styles.progress}
                  role="progressbar"
                >
                  <i style={{ "--site-progress": `${site.completion}%` } as CSSProperties} />
                </div>
                <small>{site.missingLabel}</small>
              </div>

              <div className={styles.locale}>
                <strong>{site.localeLabel}</strong>
                <code>{site.locales.join(" · ")}</code>
              </div>

              <div className={styles.actions}>
                <Link href={`/projects/sites/backlog?site=${site.id}`}>Backlog</Link>
                <a
                  className={styles.primary}
                  href={`http://127.0.0.1:3006/preview/${site.id}/${site.defaultLocale}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visualizar
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
