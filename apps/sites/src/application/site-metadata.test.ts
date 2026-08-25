import { afterEach, describe, expect, it, vi } from "vitest"
import { siteDefinitionSchema, siteMessagesSchema } from "../domain/site-config"
import { buildSiteMetadata, trustedCanonicalOrigins } from "./site-metadata"

describe("buildSiteMetadata", () => {
  afterEach(() => vi.unstubAllEnvs())
  it("maps canonical, social, icons and robots from resolved configuration", () => {
    const site = siteDefinitionSchema.parse({
      schemaVersion: 1,
      id: "example",
      name: "Example",
      status: "active",
      presetId: "marketing",
      defaultLocale: "pt-BR",
      locales: ["pt-BR"],
      domains: ["example.com"],
      metadata: {
        title: "Example",
        titleTemplate: "%s · Example",
        description: "Description",
        canonicalPath: "/preview/example/pt-BR",
        openGraphImage: "/sites/example/og.svg",
        twitterCard: "summary_large_image",
        icons: ["/sites/example/icon.svg"],
        robots: { index: false, follow: false },
      },
    })
    const messages = siteMessagesSchema.parse({
      hero: { title: "Olá", description: "Descrição", cta: "Começar" },
    })

    expect(
      buildSiteMetadata({ site, locale: "pt-BR", fallback: false, messages }, {
        allowedOrigins: ["https://example.com"],
      }),
    ).toMatchObject({
      metadataBase: new URL("https://example.com"),
      title: { default: "Example", template: "%s · Example" },
      description: "Description",
      alternates: { canonical: "/preview/example/pt-BR" },
      openGraph: { images: ["/sites/example/og.svg"], locale: "pt-BR" },
      twitter: { card: "summary_large_image" },
      icons: { icon: ["/sites/example/icon.svg"] },
      robots: { index: false, follow: false },
    })
  })

  it("rejects a configured metadata domain that is not an origin allowlist entry", () => {
    const site = siteDefinitionSchema.parse({
      schemaVersion: 1,
      id: "example",
      name: "Example",
      status: "active",
      presetId: "marketing",
      defaultLocale: "pt-BR",
      locales: ["pt-BR"],
      domains: ["https://example.com/unexpected-path"],
      metadata: { title: "Example" },
    })
    const messages = siteMessagesSchema.parse({
      hero: { title: "OlÃ¡", description: "DescriÃ§Ã£o", cta: "ComeÃ§ar" },
    })

    expect(() => buildSiteMetadata({ site, locale: "pt-BR", fallback: false, messages }, {
      allowedOrigins: ["https://example.com"],
    }))
      .toThrow("Invalid site metadata origin.")
  })

  it("rejects a canonical host that is not explicitly allowlisted", () => {
    const site = siteDefinitionSchema.parse({
      schemaVersion: 1,
      id: "example",
      name: "Example",
      status: "active",
      presetId: "marketing",
      defaultLocale: "pt-BR",
      locales: ["pt-BR"],
      domains: ["attacker.example"],
      metadata: { title: "Example" },
    })
    const messages = siteMessagesSchema.parse({
      hero: { title: "OlÃ¡", description: "DescriÃ§Ã£o", cta: "ComeÃ§ar" },
    })

    expect(() => buildSiteMetadata({ site, locale: "pt-BR", fallback: false, messages }, {
      allowedOrigins: ["https://example.com"],
    })).toThrow("Site metadata origin is not allowlisted.")
  })

  it("requires HTTPS canonical origins in production and fails when deployment configuration is absent", () => {
    expect(() => trustedCanonicalOrigins({ NODE_ENV: "production" }))
      .toThrow("Missing required canonical site origin.")
    expect(() => trustedCanonicalOrigins({ NODE_ENV: "production", SITES_CANONICAL_ORIGINS: "http://localhost:3006" }))
      .toThrow("Invalid site metadata origin.")
    expect(trustedCanonicalOrigins({ NODE_ENV: "production", SITES_CANONICAL_ORIGINS: "https://sites.matriz.example" }))
      .toEqual(["https://sites.matriz.example"])
  })

  it("uses the configured canonical origin when production site configuration has no domain", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("SITES_CANONICAL_ORIGINS", "https://sites.matriz.example")
    const site = siteDefinitionSchema.parse({
      schemaVersion: 1,
      id: "example",
      name: "Example",
      status: "active",
      presetId: "marketing",
      defaultLocale: "pt-BR",
      locales: ["pt-BR"],
      domains: [],
      metadata: { title: "Example" },
    })
    const messages = siteMessagesSchema.parse({
      hero: { title: "Olá", description: "Descrição", cta: "Começar" },
    })

    expect(buildSiteMetadata({ site, locale: "pt-BR", fallback: false, messages }).metadataBase)
      .toEqual(new URL("https://sites.matriz.example"))
  })
})
