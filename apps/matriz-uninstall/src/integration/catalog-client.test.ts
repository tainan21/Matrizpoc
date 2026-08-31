import { afterEach, describe, expect, it, vi } from "vitest"
import { DistributionCatalogClient } from "./catalog-client"

const catalog = { schemaVersion: "v1", generatedAt: "2026-08-28T12:00:00.000Z", products: [] }

describe("DistributionCatalogClient", () => {
  afterEach(() => vi.restoreAllMocks())

  it("uses the last validated catalog while offline", async () => {
    localStorage.clear()
    const online = new DistributionCatalogClient("http://hub.test", async () =>
      Response.json(catalog),
    )
    await online.load()
    const offline = new DistributionCatalogClient("http://hub.test", async () => {
      throw new Error("offline")
    })

    expect(await offline.load()).toEqual(catalog)
  })

  it("labels cached catalogs with freshness and never calls them latest", async () => {
    localStorage.clear()
    const now = new Date("2026-08-30T12:00:00.000Z")
    const online = new DistributionCatalogClient("http://hub.test", async () => Response.json(catalog), () => now)
    await online.loadSnapshot()
    const offline = new DistributionCatalogClient("http://hub.test", async () => { throw new Error("offline") }, () => new Date("2026-08-31T13:00:00.000Z"))

    const snapshot = await offline.loadSnapshot()
    expect(snapshot.source).toBe("cache")
    expect(snapshot.freshness).toBe("stale")
    expect(snapshot.message).toContain("última versão conhecida")
  })

  it("fails closed when neither network nor a valid cache is available", async () => {
    localStorage.clear()
    const client = new DistributionCatalogClient("http://hub.test", async () => {
      throw new Error("offline")
    })
    await expect(client.load()).rejects.toThrow("Nenhum catálogo confiável")
  })

  it("does not discard a validated network catalog when file storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked")
    })
    const client = new DistributionCatalogClient("http://hub.test", async () =>
      Response.json(catalog),
    )
    await expect(client.load()).resolves.toEqual(catalog)
  })

  it("uses the global fetch without binding it as an instance method", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(catalog))
    const client = new DistributionCatalogClient("http://hub.test")
    await expect(client.load()).resolves.toEqual(catalog)
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
