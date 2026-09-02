import { describe, expect, it } from "vitest"
import type { DistributionProductInputV1 } from "@matriz/integration-api-contracts"

import { createMemoryDistributionRepository } from "../integration/memory-distribution-repository"
import { createDistributionHttpHandlers } from "./distribution-http"
import { DistributionService } from "./distribution-service"

const product: DistributionProductInputV1 = {
  productId: "matriz-pay",
  displayName: "Matriz Pay",
  edition: "Web",
  runtime: "web",
  platform: "win32",
  arch: "x64",
  windows: {
    uninstallKey: "Matriz Pay",
    displayName: "Matriz Pay",
    publisher: "Matriz",
    executableName: "Matriz Pay.exe",
    aliases: [],
  },
}

describe("distribution HTTP handlers", () => {
  it("serves the published catalog without authentication", async () => {
    const handlers = createDistributionHttpHandlers(
      new DistributionService(createMemoryDistributionRepository()),
    )
    const response = await handlers.catalog(
      new Request("http://localhost/api/v1/distribution/catalog"),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=300",
    )
    expect(response.headers.get("access-control-allow-origin")).toBe("*")
    expect(await response.json()).toMatchObject({ schemaVersion: "v1", products: [] })
  })

  it("requires an authorized actor and idempotency key for product creation", async () => {
    const handlers = createDistributionHttpHandlers(
      new DistributionService(createMemoryDistributionRepository()),
      {
        authorize: (request) =>
          request.headers.get("authorization") === "Bearer valid-service-token"
            ? { userId: "service:matriz-admin", capabilities: ["distribution.catalog.manage"] }
            : null,
      },
    )
    const unauthorized = await handlers.createProduct(
      new Request("http://localhost/api/v1/distribution/admin/products", {
        method: "POST",
        body: JSON.stringify(product),
      }),
    )
    const authorized = await handlers.createProduct(
      new Request("http://localhost/api/v1/distribution/admin/products", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-service-token",
          "idempotency-key": "create-matriz-pay",
          "content-type": "application/json",
        },
        body: JSON.stringify(product),
      }),
    )

    expect(unauthorized.status).toBe(401)
    expect(authorized.status).toBe(201)
    expect(await authorized.json()).toMatchObject({ productId: "matriz-pay", release: null })
  })

  it("serves a Tauri-compatible updater response and returns 204 when current", async () => {
    const service = new DistributionService(createMemoryDistributionRepository())
    const actor = { userId: "release", capabilities: ["distribution.catalog.manage"] }
    await service.createProduct(actor, { ...product, productId: "matriz-control", runtime: "tauri" }, "control-product")
    const release = await service.createRelease(actor, "matriz-control", {
      version: "1.1.0",
      channel: "stable",
      releasedAt: "2026-09-02T12:00:00.000Z",
      releaseNotes: "Atualização estável.",
      installer: {
        fileName: "matriz-control-1.1.0-windows-x64-setup.exe",
        downloadUrl: "https://releases.matriz.local/matriz-control.exe",
        sizeBytes: 2048,
        sha256: "a".repeat(64),
      },
      signature: "bWFuaWZlc3Qtc2lnbmF0dXJl",
      updater: {
        "windows-x86_64": {
          url: "https://releases.matriz.local/matriz-control-updater.exe",
          signature: "dGF1cmktYXJ0aWZhY3Qtc2lnbmF0dXJl",
          sizeBytes: 2048,
        },
      },
    }, "control-release")
    await service.publishRelease(actor, release.releaseId, "control-publish")
    const handlers = createDistributionHttpHandlers(service)

    const available = await handlers.updater("matriz-control", "windows-x86_64", "1.0.0")
    expect(available.status).toBe(200)
    expect(await available.json()).toEqual({
      version: "1.1.0",
      notes: "Atualização estável.",
      pub_date: "2026-09-02T12:00:00.000Z",
      url: "https://releases.matriz.local/matriz-control-updater.exe",
      signature: "dGF1cmktYXJ0aWZhY3Qtc2lnbmF0dXJl",
    })
    expect((await handlers.updater("matriz-control", "windows-x86_64", "1.1.0")).status).toBe(204)
  })
})
