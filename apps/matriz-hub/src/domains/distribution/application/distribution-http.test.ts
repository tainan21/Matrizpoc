import { describe, expect, it } from "vitest"

import { createMemoryDistributionRepository } from "../integration/memory-distribution-repository"
import { createDistributionHttpHandlers } from "./distribution-http"
import { DistributionService } from "./distribution-service"

const product = {
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
    const handlers = createDistributionHttpHandlers(new DistributionService(createMemoryDistributionRepository()))
    const response = await handlers.catalog(new Request("http://localhost/api/v1/distribution/catalog"))

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("public, max-age=60, stale-while-revalidate=300")
    expect(response.headers.get("access-control-allow-origin")).toBe("*")
    expect(await response.json()).toMatchObject({ schemaVersion: "v1", products: [] })
  })

  it("requires an authorized actor and idempotency key for product creation", async () => {
    const handlers = createDistributionHttpHandlers(new DistributionService(createMemoryDistributionRepository()), {
      authorize: (request) => request.headers.get("authorization") === "Bearer valid-service-token"
        ? { userId: "service:matriz-admin", capabilities: ["distribution.catalog.manage"] }
        : null,
    })
    const unauthorized = await handlers.createProduct(new Request("http://localhost/api/v1/distribution/admin/products", {
      method: "POST",
      body: JSON.stringify(product),
    }))
    const authorized = await handlers.createProduct(new Request("http://localhost/api/v1/distribution/admin/products", {
      method: "POST",
      headers: { authorization: "Bearer valid-service-token", "idempotency-key": "create-matriz-pay", "content-type": "application/json" },
      body: JSON.stringify(product),
    }))

    expect(unauthorized.status).toBe(401)
    expect(authorized.status).toBe(201)
    expect(await authorized.json()).toMatchObject({ productId: "matriz-pay", release: null })
  })
})
