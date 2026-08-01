import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { FileSiteCatalog } from "../integration/file-site-catalog"

const roots: string[] = []

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-sites-"))
  roots.push(root)
  await mkdir(path.join(root, "sites", "_presets"), { recursive: true })
  await mkdir(path.join(root, "sites", "example", "messages"), { recursive: true })
  await mkdir(path.join(root, "public", "sites", "example"), { recursive: true })
  await writeFile(
    path.join(root, "sites", "_presets", "marketing.json"),
    JSON.stringify({
      schemaVersion: 1,
      id: "marketing",
      metadata: {
        description: "Default",
        openGraphImage: "/sites/example/og.svg",
        robots: { index: false, follow: false },
      },
    }),
  )
  await writeFile(
    path.join(root, "sites", "example", "site.json"),
    JSON.stringify({
      schemaVersion: 1,
      id: "example",
      name: "Example",
      status: "active",
      presetId: "marketing",
      defaultLocale: "pt-BR",
      locales: ["pt-BR", "en"],
      domains: [],
      metadata: { title: "Example" },
    }),
  )
  await writeFile(
    path.join(root, "sites", "example", "messages", "pt-BR.json"),
    JSON.stringify({ hero: { title: "Olá", description: "Descrição", cta: "Começar" } }),
  )
  await writeFile(
    path.join(root, "sites", "example", "messages", "en.json"),
    JSON.stringify({ hero: { title: "Hello", description: "Description", cta: "Start" } }),
  )
  return { root, catalog: await FileSiteCatalog.create(root) }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("FileSiteCatalog", () => {
  it("loads resolved metadata and the requested locale", async () => {
    const { catalog } = await fixture()

    const result = await catalog.getSite("example", "en")

    expect(result.locale).toBe("en")
    expect(result.fallback).toBe(false)
    expect(result.messages.hero.title).toBe("Hello")
    expect(result.site.metadata.description).toBe("Default")
  })

  it("falls back explicitly and reports missing metadata assets", async () => {
    const { catalog } = await fixture()

    const result = await catalog.getSite("example", "fr")
    const health = await catalog.inspectSite("example")

    expect(result.locale).toBe("pt-BR")
    expect(result.fallback).toBe(true)
    expect(health.missingAssets).toEqual(["/sites/example/og.svg"])
    expect(health.completeLocales).toEqual(["en", "pt-BR"])
  })
})
