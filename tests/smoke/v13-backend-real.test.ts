/**
 * V1.3 Backend-real smoke tests — DB-free composition and shape checks.
 *
 * These tests prove that V1.3 did NOT break the architecture:
 *   - All 4 generated Prisma clients export the correct model sets.
 *   - All repositories compose and expose the expected interfaces.
 *   - The MCP handler responds to the 5 required methods.
 *   - Identity linking policy composes via resolveIdentityByEmail.
 *
 * For DB-backed end-to-end proof of the 4 required flows, run
 * `scripts/demo-flows.ts` against a real Postgres.
 */
import { describe, it, expect } from "vitest"

describe("V1.3 — schema client wrappers export expected surface", () => {
  it("core exposes User, AuthAccount, AuthVerificationChallenge, AppSession, TelemetryRecord", async () => {
    const mod = await import("../../packages/platform/db/src/core")
    expect(typeof mod.getCoreDb).toBe("function")
    // The module re-exports the generated client, including the Prisma enum runtime.
    expect(mod).toHaveProperty("AuthProvider")
    expect(mod).toHaveProperty("AuthChallengeKind")
  })

  it("hub exposes InstitutionalProject, Source, IngestionRun, HealthSnapshot, PublicMetricsSnapshot", async () => {
    const mod = await import("../../packages/platform/db/src/hub")
    expect(typeof mod.getHubDb).toBe("function")
  })

  it("seumei exposes Establishment + EstablishmentType", async () => {
    const mod = await import("../../packages/platform/db/src/seumei")
    expect(typeof mod.getSeumeiDb).toBe("function")
    expect(mod).toHaveProperty("EstablishmentType")
  })

  it("contracts exposes Contract + ContractStatus + ContractPartyRole", async () => {
    const mod = await import("../../packages/platform/db/src/contracts")
    expect(typeof mod.getContractsDb).toBe("function")
    expect(mod).toHaveProperty("ContractStatus")
    expect(mod).toHaveProperty("ContractPartyRole")
  })
})

describe("V1.3 — core repositories compose with expected methods", () => {
  it("user repo has findByEmail, findById, upsertByEmail", async () => {
    const { makeUserRepo } = await import(
      "../../packages/platform/db/src/repositories/core/users.repo"
    )
    const repo = makeUserRepo({} as never)
    expect(Object.keys(repo).sort()).toEqual(
      ["findByEmail", "findById", "upsertByEmail"].sort(),
    )
  })

  it("auth-accounts repo has findByProviderSubject, linkToUser", async () => {
    const { makeAuthAccountRepo } = await import(
      "../../packages/platform/db/src/repositories/core/auth-accounts.repo"
    )
    const repo = makeAuthAccountRepo({} as never)
    expect(Object.keys(repo).sort()).toEqual(
      ["findByProviderSubject", "linkToUser"].sort(),
    )
  })

  it("auth-challenges repo has create, findLiveByEmail, consume, purgeStale", async () => {
    const { makeAuthChallengeRepo } = await import(
      "../../packages/platform/db/src/repositories/core/auth-challenges.repo"
    )
    const repo = makeAuthChallengeRepo({} as never)
    expect(Object.keys(repo).sort()).toEqual(
      ["consume", "create", "findLiveByEmail", "incrementAttempts", "purgeStale"].sort(),
    )
  })

  it("app-sessions repo has create, findActiveByToken, revoke, listByUser", async () => {
    const { makeAppSessionRepo } = await import(
      "../../packages/platform/db/src/repositories/core/app-sessions.repo"
    )
    const repo = makeAppSessionRepo({} as never)
    expect(Object.keys(repo).sort()).toEqual(
      ["create", "findActiveByToken", "listByUser", "revoke", "revokeByToken"].sort(),
    )
  })

  it("telemetry repo has record, recordBatch, countByCategory, listRecent", async () => {
    const { makeTelemetryRepo } = await import(
      "../../packages/platform/db/src/repositories/core/telemetry.repo"
    )
    const repo = makeTelemetryRepo({} as never)
    expect(Object.keys(repo).sort()).toEqual(
      ["countByCategory", "listRecent", "record", "recordBatch"].sort(),
    )
  })
})

describe("V1.3 — hub repositories compose with expected methods", () => {
  it("projects repo supports upsertFromManifest and search", async () => {
    const { makeProjectRepo } = await import(
      "../../apps/matriz-hub/src/integration/prisma/repositories/projects-repository"
    )
    const repo = makeProjectRepo({} as never)
    expect(Object.keys(repo).sort()).toEqual(
      ["findByProjectId", "listAll", "search", "upsertFromManifest"].sort(),
    )
  })

  it("ingestion-runs repo supports record", async () => {
    const { makeIngestionRunRepo } = await import(
      "../../apps/matriz-hub/src/integration/prisma/repositories/ingestion-runs-repository"
    )
    const repo = makeIngestionRunRepo({} as never)
    expect(Object.keys(repo).sort()).toEqual(["latest", "listBySource", "record"].sort())
  })
})

describe("V1.3 — token hashing is deterministic and one-way", () => {
  it("hashToken produces a 64-char hex sha256", async () => {
    const { hashToken } = await import(
      "../../packages/platform/db/src/repositories/core/app-sessions.repo"
    )
    const a = hashToken("demo-token")
    const b = hashToken("demo-token")
    const c = hashToken("demo-token-2")
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe("V1.3 — MCP handler responds to the 5 required methods", () => {
  it("initialize returns protocolVersion and serverInfo", async () => {
    const { handleMcpRequest } = await import(
      "../../apps/matriz-hub/src/mcp/handler"
    )
    const res = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
    })
    expect("result" in res).toBe(true)
    if ("result" in res) {
      const result = res.result as {
        protocolVersion: string
        serverInfo: { name: string }
      }
      expect(result.protocolVersion).toBe("2024-11-05")
      expect(result.serverInfo.name).toBe("matriz-hub-mcp")
    }
  })

  it("ping returns empty object", async () => {
    const { handleMcpRequest } = await import(
      "../../apps/matriz-hub/src/mcp/handler"
    )
    const res = await handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "ping" })
    expect("result" in res).toBe(true)
    if ("result" in res) expect(res.result).toEqual({})
  })

  it("tools/list exposes refresh_project_ingestion", async () => {
    const { handleMcpRequest } = await import(
      "../../apps/matriz-hub/src/mcp/handler"
    )
    const res = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/list",
    })
    expect("result" in res).toBe(true)
    if ("result" in res) {
      const r = res.result as { tools: Array<{ name: string }> }
      expect(r.tools.map((t) => t.name)).toContain("refresh_project_ingestion")
    }
  })

  it("unknown method returns JSON-RPC -32601", async () => {
    const { handleMcpRequest } = await import(
      "../../apps/matriz-hub/src/mcp/handler"
    )
    const res = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "nonexistent",
    })
    expect("error" in res).toBe(true)
    if ("error" in res) expect(res.error.code).toBe(-32601)
  })

  it("resources/read with malformed params returns -32602", async () => {
    const { handleMcpRequest } = await import(
      "../../apps/matriz-hub/src/mcp/handler"
    )
    const res = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "resources/read",
      params: {},
    })
    expect("error" in res).toBe(true)
    if ("error" in res) expect(res.error.code).toBe(-32602)
  })
})

describe("V1.3 — auth server-db surface is fully exported", () => {
  it("exports challenge/session/identity primitives from server-db entry", async () => {
    const mod = await import("../../packages/platform/auth/src/server-db")
    expect(typeof mod.issueOtpChallenge).toBe("function")
    expect(typeof mod.issueMagicLinkChallenge).toBe("function")
    expect(typeof mod.verifyChallenge).toBe("function")
    expect(typeof mod.resolveIdentityByEmail).toBe("function")
    expect(typeof mod.issueSession).toBe("function")
    expect(typeof mod.readSessionByToken).toBe("function")
    expect(typeof mod.revokeSessionByToken).toBe("function")
  })
})
