import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  distributionCatalogV1Schema,
  distributionProductInputV1Schema,
  distributionReleaseInputV1Schema,
} from "@matriz/integration-api-contracts"

const identity = {
  uninstallKey: "Matriz Control",
  displayName: "Matriz Control",
  publisher: "Matriz",
  executableName: "matriz-control.exe",
  aliases: ["Matriz Control 0.1.0"],
}

describe("distribution catalog v1 contract", () => {
  it("keeps Tauri and Electron editions as distinct Windows products", () => {
    const catalog = distributionCatalogV1Schema.parse({
      schemaVersion: "v1",
      generatedAt: "2026-08-28T12:00:00.000Z",
      products: [
        {
          productId: "matriz-control-tauri",
          displayName: "Matriz Control",
          edition: "Tauri",
          runtime: "tauri",
          platform: "win32",
          arch: "x64",
          state: "active",
          windows: identity,
          release: null,
        },
        {
          productId: "matriz-control-electron",
          displayName: "Matriz Control",
          edition: "Electron",
          runtime: "electron",
          platform: "win32",
          arch: "x64",
          state: "active",
          windows: { ...identity, uninstallKey: "9b8c8dfd-77ee-5d4b-b4b3-34afd8c1a76d" },
          release: null,
        },
      ],
    })

    expect(catalog.products.map(({ productId }) => productId)).toEqual([
      "matriz-control-tauri",
      "matriz-control-electron",
    ])
  })

  it("rejects unsafe Windows identities and non-HTTPS stable artifacts", () => {
    expect(() => distributionProductInputV1Schema.parse({
      productId: "unsafe",
      displayName: "Unsafe",
      edition: "Electron",
      runtime: "electron",
      platform: "win32",
      arch: "x64",
      windows: { ...identity, uninstallKey: "..\\Unsafe" },
    })).toThrow()

    expect(() => distributionReleaseInputV1Schema.parse({
      version: "1.0.0",
      channel: "stable",
      releasedAt: "2026-08-28T12:00:00.000Z",
      releaseNotes: null,
      installer: {
        fileName: "unsafe-1.0.0-windows-x64-setup.exe",
        downloadUrl: "http://example.com/unsafe.exe",
        sizeBytes: 10,
        sha256: "a".repeat(64),
      },
      signature: "c2lnbmF0dXJl",
    })).toThrow()
  })

  it("persists products, releases, idempotency and audits in the Hub schema", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/hub/schema.prisma"), "utf8")
    const migration = readFileSync(
      join(process.cwd(), "prisma/hub/migrations/202608280001_distribution_catalog/migration.sql"),
      "utf8",
    )

    expect(schema).toContain("model DistributionProduct")
    expect(schema).toContain("model DistributionRelease")
    expect(schema).toContain("model DistributionAudit")
    expect(schema).toContain("model DistributionIdempotency")
    expect(migration).toContain('CREATE TABLE "distribution_products"')
    expect(migration).toContain('CREATE UNIQUE INDEX "distribution_releases_productId_channel_version_key"')
  })
})
