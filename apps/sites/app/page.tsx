import Link from "next/link"
import { FileSiteCatalog } from "../src/integration/file-site-catalog"

export const dynamic = "force-dynamic"

export default async function SitesCatalogPage() {
  const catalog = await FileSiteCatalog.create(process.cwd())
  const sites = await catalog.listSites()
  const health = await Promise.all(sites.map((site) => catalog.inspectSite(site.id)))

  return (
    <main className="catalog-shell">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Matriz · site collection</p>
          <h1>Um runtime.<br />Muitas identidades.</h1>
          <p>Metadata, idiomas e assets por site. Renderer e padrões compartilhados.</p>
        </div>
        <span className="catalog-count">{sites.length.toString().padStart(2, "0")}</span>
      </header>
      <section className="site-list" aria-label="Sites configurados">
        {sites.map((site, index) => {
          const status = health[index]
          return (
            <article className="site-row" key={site.id}>
              <span className="site-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p>{site.status} · preset {site.presetId}</p>
                <h2>{site.name}</h2>
              </div>
              <dl>
                <div><dt>Idiomas</dt><dd>{status?.completeLocales.join(", ")}</dd></div>
                <div><dt>Assets</dt><dd>{status?.missingAssets.length ? `${status.missingAssets.length} pendente(s)` : "completos"}</dd></div>
              </dl>
              <Link href={`/preview/${site.id}/${site.defaultLocale}`}>Abrir preview <span>↗</span></Link>
            </article>
          )
        })}
      </section>
    </main>
  )
}
