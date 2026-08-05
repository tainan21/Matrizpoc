import type { MetadataRoute } from "next"
import { FileSiteCatalog } from "../src/integration/file-site-catalog"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await FileSiteCatalog.create(process.cwd())
  const base = "http://127.0.0.1:3006"
  return (await catalog.listSites()).flatMap((site) =>
    site.locales.map((locale) => ({
      url: `${base}/preview/${site.id}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: locale === site.defaultLocale ? 0.8 : 0.6,
    })),
  )
}
