import { describe, expect, it } from "vitest"

import { createMemoryDistributionRepository } from "../integration/memory-distribution-repository"
import { DistributionService } from "./distribution-service"

const actor = { userId: "user_admin", capabilities: ["distribution.catalog.manage"] as const }
const product = {
  productId: "matriz-ops-tauri",
  displayName: "Matriz Ops",
  edition: "Tauri",
  runtime: "tauri" as const,
  platform: "win32" as const,
  arch: "x64" as const,
  windows: {
    uninstallKey: "Matriz Ops",
    displayName: "Matriz Ops",
    publisher: "Matriz",
    executableName: "matriz-ops.exe",
    aliases: [],
  },
}
const release = {
  version: "1.2.0",
  channel: "stable" as const,
  releasedAt: "2026-08-28T12:00:00.000Z",
  releaseNotes: "Primeira release confiável.",
  installer: {
    fileName: "matriz-ops-1.2.0-windows-x64-setup.exe",
    downloadUrl: "https://github.com/matriz/releases/matriz-ops.exe",
    sizeBytes: 2048,
    sha256: "a".repeat(64),
  },
  signature: "c2lnbmF0dXJlLXZhbGlkYQ==",
}

describe("DistributionService", () => {
  it("publishes an idempotent release and exposes only the published catalog", async () => {
    const service = new DistributionService(
      createMemoryDistributionRepository(),
      () => new Date("2026-08-28T13:00:00.000Z"),
    )
    await service.createProduct(actor, product, "product-request")
    const draft = await service.createRelease(actor, product.productId, release, "release-request")

    expect((await service.catalog()).products[0]?.release).toBeNull()

    const first = await service.publishRelease(actor, draft.releaseId, "publish-request")
    const replay = await service.publishRelease(actor, draft.releaseId, "publish-request")

    expect(replay).toEqual(first)
    expect((await service.catalog()).products[0]?.release?.version).toBe("1.2.0")
    expect(await service.audit()).toHaveLength(3)
  })

  it("denies catalog changes without the management capability", async () => {
    const service = new DistributionService(createMemoryDistributionRepository())

    expect(() =>
      service.createProduct({ userId: "viewer", capabilities: [] }, product, "denied-request"),
    ).toThrow("distribution.catalog.manage")
  })
})
