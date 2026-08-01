import { describe, expect, it } from "vitest"
import {
  resolveSiteDefinition,
  siteDefinitionSchema,
  sitePresetSchema,
} from "./site-config"

const preset = sitePresetSchema.parse({
  schemaVersion: 1,
  id: "marketing",
  metadata: {
    titleTemplate: "%s · Matriz",
    description: "Shared description",
    keywords: ["matriz", "site"],
    openGraphImage: "/sites/example/og.svg",
    robots: { index: false, follow: false },
  },
})

describe("site configuration", () => {
  it("rejects a default locale outside the locale catalog", () => {
    expect(
      siteDefinitionSchema.safeParse({
        schemaVersion: 1,
        id: "example",
        name: "Example",
        status: "active",
        presetId: "marketing",
        defaultLocale: "pt-BR",
        locales: ["en"],
        domains: [],
        metadata: { title: "Example" },
      }).success,
    ).toBe(false)
  })

  it("resolves preset metadata with explicit site overrides", () => {
    const site = siteDefinitionSchema.parse({
      schemaVersion: 1,
      id: "example",
      name: "Example",
      status: "active",
      presetId: "marketing",
      defaultLocale: "pt-BR",
      locales: ["pt-BR", "en"],
      domains: ["example.local"],
      metadata: {
        title: "Example",
        description: "Site-specific description",
        canonicalPath: "/preview/example/pt-BR",
      },
    })

    expect(resolveSiteDefinition(preset, site).metadata).toMatchObject({
      title: "Example",
      titleTemplate: "%s · Matriz",
      description: "Site-specific description",
      keywords: ["matriz", "site"],
      robots: { index: false, follow: false },
    })
  })
})
