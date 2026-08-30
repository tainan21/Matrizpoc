import { describe, expect, it } from "vitest"
import { localAppCatalog } from "./catalog"
import path from "node:path"
import { loadLocalAppCatalog, validateCatalogEntries } from "./catalog-loader"

describe("project factory runtime catalog", () => {
  it("describes the thirteen managed web runtimes with unique ports", () => {
    const result = validateCatalogEntries(localAppCatalog)

    expect(result.issues).toEqual([])
    expect(result.apps).toHaveLength(13)
    expect(result.apps.map((app) => app.preferredPort)).toEqual([
      3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011, 3012,
    ])
  })

  it("rejects duplicate slugs, app ids, directories and ports", () => {
    const duplicate = [localAppCatalog[0]!, { ...localAppCatalog[0]! }]

    expect(validateCatalogEntries(duplicate).issues).toEqual([
      'Duplicate slug "hub".',
      'Duplicate appId "matriz-hub".',
      'Duplicate directory "apps/matriz-hub".',
      "Duplicate preferredPort 3000.",
    ])
  })

  it("rejects unsafe runtime values", () => {
    const invalid = [{
      ...localAppCatalog[0]!,
      slug: "../hub",
      directory: "packages/platform/config",
      preferredPort: 80,
      healthPath: "health",
    }]

    expect(validateCatalogEntries(invalid).issues).toEqual([
      'Invalid slug "../hub".',
      'Invalid app directory "packages/platform/config".',
      "Preferred port 80 must be between 1024 and 65535.",
      'Health path "health" must start with "/".',
    ])
  })

  it("verifies packages and manifests against the repository", async () => {
    const result = await loadLocalAppCatalog(path.resolve("."))

    expect(result.issues).toEqual([])
    expect(result.apps.find((app) => app.slug === "spot")?.packageName).toBe(
      "@matriz/app-spot",
    )
  })
})
