import type { Metadata } from "next"
import Link from "next/link"
import { ThemeToggle } from "@matriz/design-ui"
import { notFound } from "next/navigation"
import { buildSiteMetadata } from "../../../../src/application/site-metadata"
import { FileSiteCatalog } from "../../../../src/integration/file-site-catalog"

interface PageProps {
  params: Promise<{ siteId: string; locale: string }>
}

async function load({ params }: PageProps) {
  const { siteId, locale } = await params
  const catalog = await FileSiteCatalog.create(process.cwd())
  return catalog.getSite(siteId, locale).catch(() => notFound())
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return buildSiteMetadata(await load(props))
}

export async function generateStaticParams() {
  const catalog = await FileSiteCatalog.create(process.cwd())
  return (await catalog.listSites()).flatMap((site) =>
    site.locales.map((locale) => ({ siteId: site.id, locale })),
  )
}

export default async function SitePreviewPage(props: PageProps) {
  const { site, messages, locale, fallback } = await load(props)
  return (
    <main className="preview-shell">
      <nav className="preview-nav" aria-label="Preview">
        <Link href="/">Matriz Sites</Link>
        <span>{site.name}</span>
        <div>
          {site.locales.map((item) => (
            <Link
              aria-current={item === locale ? "page" : undefined}
              href={`/preview/${site.id}/${item}`}
              key={item}
            >
              {item}
            </Link>
          ))}
          <ThemeToggle appId="sites" />
        </div>
      </nav>
      {fallback ? (
        <p className="locale-notice">Locale indisponível; exibindo {locale}.</p>
      ) : null}
      <section className="preview-hero">
        <p className="eyebrow">{messages.hero.eyebrow}</p>
        <h1>{messages.hero.title}</h1>
        <p>{messages.hero.description}</p>
        <a href="#modelo">{messages.hero.cta}</a>
      </section>
      <section className="model-strip" id="modelo">
        <div><span>01</span><strong>Config</strong><small>site.json</small></div>
        <div><span>02</span><strong>Idioma</strong><small>{locale}.json</small></div>
        <div><span>03</span><strong>Preset</strong><small>{site.presetId}</small></div>
        <div><span>04</span><strong>Metadata</strong><small>Next.js</small></div>
      </section>
    </main>
  )
}
