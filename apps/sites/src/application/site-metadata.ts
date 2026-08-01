import type { Metadata } from "next"
import type { LoadedSite } from "../integration/file-site-catalog"

export function buildSiteMetadata(result: LoadedSite): Metadata {
  const { site, locale } = result
  const metadata = site.metadata
  const primaryDomain = site.domains[0]
  const metadataBase = new URL(
    primaryDomain
      ? primaryDomain.startsWith("http://") ||
        primaryDomain.startsWith("https://")
        ? primaryDomain
        : `https://${primaryDomain}`
      : "http://127.0.0.1:3006",
  )
  return {
    metadataBase,
    title: metadata.titleTemplate
      ? { default: metadata.title, template: metadata.titleTemplate }
      : metadata.title,
    description: metadata.description,
    keywords: metadata.keywords,
    alternates: metadata.canonicalPath
      ? { canonical: metadata.canonicalPath }
      : undefined,
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      locale,
      images: metadata.openGraphImage
        ? [metadata.openGraphImage]
        : undefined,
    },
    twitter: metadata.twitterCard
      ? {
          card: metadata.twitterCard,
          title: metadata.title,
          description: metadata.description,
          images: metadata.openGraphImage
            ? [metadata.openGraphImage]
            : undefined,
        }
      : undefined,
    icons: metadata.icons?.length ? { icon: metadata.icons } : undefined,
    robots: metadata.robots
      ? {
          index: metadata.robots.index,
          follow: metadata.robots.follow,
        }
      : undefined,
  }
}
