import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { SiteCatalogBridge } from "./site-catalog-bridge"

const roots: string[] = []

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-site-bridge-"))
  roots.push(root)
  await mkdir(path.join(root, "apps", "sites", "sites", "example"), {
    recursive: true,
  })
  await writeFile(
    path.join(root, "apps", "sites", "sites", "example", "site.json"),
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
  return SiteCatalogBridge.create(root)
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("SiteCatalogBridge", () => {
  it("projects site configuration without importing the Sites app", async () => {
    const bridge = await fixture()

    await expect(bridge.listSites()).resolves.toEqual([
      {
        id: "example",
        name: "Example",
        status: "active",
        presetId: "marketing",
        defaultLocale: "pt-BR",
        locales: ["pt-BR", "en"],
        metadataCompleteness: {
          completed: 1,
          total: 5,
          missing: ["canonicalPath", "description", "icons", "openGraphImage"],
        },
      },
    ])
  })

  it("rejects arbitrary site identifiers", async () => {
    const bridge = await fixture()
    await expect(bridge.getSite("../outside")).rejects.toMatchObject({
      code: "INVALID_PATH",
    })
  })
})
