import { describe, expect, it } from "vitest"
import { createCacheKey, GarnetHubCacheRepository, loadGarnetCacheConfiguration } from "./garnet-cache-repository"

describe("Hub Garnet cache repository", () => {
  it("builds versioned tenant and namespace keys", () => {
    expect(createCacheKey("tenant_local", "ecosystem", "selected-app")).toBe("matriz:v1:matriz-hub:tenant_local:ecosystem:selected-app")
    expect(() => createCacheKey("../tenant", "ecosystem", "key")).toThrow(/tenant/i)
    expect(() => createCacheKey("tenant", "other" as "ecosystem", "key")).toThrow(/namespace/i)
    expect(() => createCacheKey("tenant", "docs", "a b")).toThrow(/key/i)
  })

  it("requires the fixed loopback Garnet endpoint, credentials and TTL", () => {
    const base = { CACHE_URL: "redis://127.0.0.1:46379", HUB_CACHE_USERNAME: "matriz_hub", HUB_CACHE_PASSWORD: "x".repeat(32), HUB_CACHE_DEFAULT_TTL_SECONDS: "300" }
    expect(loadGarnetCacheConfiguration(base)).toMatchObject({ host: "127.0.0.1", port: 46379, username: "matriz_hub", defaultTtlSeconds: 300 })
    for (const invalid of ["redis://localhost:46379", "redis://127.0.0.1:6379", "redis://user:secret@127.0.0.1:46379", "rediss://127.0.0.1:46379"]) expect(() => loadGarnetCacheConfiguration({ ...base, CACHE_URL: invalid })).toThrow(/CACHE_URL/)
    expect(() => loadGarnetCacheConfiguration({ ...base, HUB_CACHE_DEFAULT_TTL_SECONDS: "0" })).toThrow(/TTL/i)
    expect(() => loadGarnetCacheConfiguration({ ...base, HUB_CACHE_PASSWORD: "short" })).toThrow(/password/i)
  })

  it("uses SET with mandatory EX and reads the same tenant-scoped JSON entry", async () => {
    const config = loadGarnetCacheConfiguration({ CACHE_URL: "redis://127.0.0.1:46379", HUB_CACHE_USERNAME: "matriz_hub", HUB_CACHE_PASSWORD: "x".repeat(32), HUB_CACHE_DEFAULT_TTL_SECONDS: "300" })
    const commands: string[][] = []
    const entry = { key: "selected-app", value: "spot", updatedAt: "2026-08-30T12:00:00.000Z", updatedBy: "user-local-owner" }
    const repository = new GarnetHubCacheRepository(config, async (_configuration, command) => { commands.push([...command]); return command[0] === "GET" ? JSON.stringify(entry) : "OK" })
    await repository.write("tenant_local", "ecosystem", entry)
    await expect(repository.read("tenant_local", "ecosystem", "selected-app")).resolves.toEqual(entry)
    expect(commands[0]).toEqual(["SET", "matriz:v1:matriz-hub:tenant_local:ecosystem:selected-app", JSON.stringify(entry), "EX", "300"])
    expect(commands[1]).toEqual(["GET", "matriz:v1:matriz-hub:tenant_local:ecosystem:selected-app"])
  })
})
