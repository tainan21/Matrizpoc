import type { Metadata } from "next"
import type { LoadedSite } from "../integration/file-site-catalog"

export interface SiteMetadataOptions {
  allowedOrigins?: readonly string[]
}

type OriginEnvironment = Readonly<Record<string, string | undefined>>

function parseCanonicalOrigin(value: string, production = false): URL {
  const candidate = value.includes("://") ? value : `https://${value}`
  let origin: URL
  try {
    origin = new URL(candidate)
  } catch {
    throw new Error("Invalid site metadata origin.")
  }

  const isLocalHttp = origin.protocol === "http:" &&
    (origin.hostname === "localhost" || origin.hostname === "127.0.0.1")
  if (
    !(origin.protocol === "https:" || (!production && isLocalHttp)) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("Invalid site metadata origin.")
  }
  return origin
}

/** Deployment configuration stays server-side; development retains the local preview origin. */
export function trustedCanonicalOrigins(environment: OriginEnvironment = process.env): readonly string[] {
  const configured = (environment.SITES_CANONICAL_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => parseCanonicalOrigin(origin, environment.NODE_ENV === "production").origin)
  if (environment.NODE_ENV === "production") {
    if (configured.length === 0) throw new Error("Missing required canonical site origin.")
    return configured
  }
  return ["http://127.0.0.1:3006", ...configured]
}

function metadataOrigin(domain: string | undefined, allowedOrigins: readonly string[]): URL {
  const allowlist = new Set(allowedOrigins.map((value) => parseCanonicalOrigin(value).origin))
  const fallbackOrigin = process.env.NODE_ENV === "production"
    ? allowedOrigins[0]
    : "http://127.0.0.1:3006"
  if (!domain && !fallbackOrigin) throw new Error("Missing required canonical site origin.")
  const origin = parseCanonicalOrigin(domain ?? fallbackOrigin, process.env.NODE_ENV === "production")
  if (!allowlist.has(origin.origin)) {
    throw new Error("Site metadata origin is not allowlisted.")
  }
  return origin
}

export function buildSiteMetadata(
  result: LoadedSite,
  options: SiteMetadataOptions = {},
): Metadata {
  const { site, locale } = result
  const metadata = site.metadata
  const primaryDomain = site.domains[0]
  const metadataBase = metadataOrigin(primaryDomain, options.allowedOrigins ?? trustedCanonicalOrigins())
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
