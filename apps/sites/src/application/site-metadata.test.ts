import { describe, expect, it } from "vitest"
import { siteDefinitionSchema, siteMessagesSchema } from "../domain/site-config"
import { buildSiteMetadata } from "./site-metadata"

describe("buildSiteMetadata", () => {
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
      buildSiteMetadata({ site, locale: "pt-BR", fallback: false, messages }),
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
})
