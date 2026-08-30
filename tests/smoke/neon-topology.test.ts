import { describe, expect, it, vi } from "vitest"
import { executeTopologySql } from "../../infrastructure/neon/database"
import { reconcileCiPhase, reconcilePrimaryPhase } from "../../infrastructure/neon/provider"
import {
  buildProvisioningSql, buildTopologyPlan, buildVerificationSql, parseTopologyMode,
  redactSensitiveText, validateDatabaseUrl, validateTopologyEnvironment,
} from "../../infrastructure/neon/topology"

const options = { projectId: "project", apiKey: "secret", ownerName: "neondb_owner", provisioningBranchId: "primary" }

describe("Neon central topology contract", () => {
  it("fixes eight schemas, distinct roles and two phased database identities", () => {
    const plan = buildTopologyPlan()
    expect(plan.schemas.map((item) => item.name)).toEqual(["core", "hub", "spot", "seumei", "contracts", "willdash", "ops", "pay"])
    expect(plan.ciBranch.name).toBe("matriz-ci")
    expect(new Set(plan.schemas.flatMap((item) => [item.migrationRole, item.runtimeRole])).size).toBe(16)
  })

  it("fails closed for missing/unsafe environment and ambiguous CLI modes", () => {
    expect(validateTopologyEnvironment({}).missing).toEqual([
      "NEON_API_KEY", "NEON_PROJECT_ID", "NEON_PRIMARY_DATABASE_URL",
      "NEON_PROVISIONING_BRANCH_ID", "NEON_DATABASE_OWNER_NAME",
    ])
    expect(validateTopologyEnvironment({ NEON_DATABASE_OWNER_NAME: "bad;drop" }).invalid).toEqual(["NEON_DATABASE_OWNER_NAME"])
    expect(parseTopologyMode([])).toBe("dry-run")
    expect(() => parseTopologyMode(["--apply", "--verify"])).toThrow("Usage")
  })

  it("maps each database URL to the exact API endpoint host and matriz database", () => {
    expect(() => validateDatabaseUrl("postgresql://u:p@primary.example/matriz", "primary.example")).not.toThrow()
    expect(() => validateDatabaseUrl("postgresql://u:p@ci.example/matriz", "primary.example")).toThrow("endpoint mismatch")
    expect(() => validateDatabaseUrl("postgresql://u:p@primary.example/other", "primary.example")).toThrow("target matriz")
  })

  it("redacts connection credentials and subprocess failures", () => {
    expect(redactSensitiveText("NEON_API_KEY=token postgresql://u:pass@host/matriz")).not.toContain("pass")
    const spawn = vi.fn().mockReturnValue({ status: 1, stderr: "postgresql://u:secret@host/matriz" })
    expect(() => executeTopologySql("SELECT 1", { databaseUrl: "postgresql://u:secret@host/matriz", spawn: spawn as never })).toThrow("failed (1)")
  })

  it("reconciles primary database then validates official endpoint metadata using GET-only verify", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ branches: [{ id: "primary", name: "main", primary: true }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [{ name: "matriz" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ endpoints: [{ id: "ep-primary", branch_id: "primary", project_id: "project", host: "primary.example", type: "read_write" }] })))
    await expect(reconcilePrimaryPhase("verify", { ...options, request })).resolves.toMatchObject({ database: "existing", endpoint: "existing" })
    expect(request.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true)
  })

  it("apply primary uses exact official database and endpoint payloads", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ branches: [{ id: "primary", name: "main", primary: true }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ database: { name: "matriz" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ endpoints: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ endpoint: { id: "ep-primary", branch_id: "primary", project_id: "project", host: "primary.example", type: "read_write" } })))
    await reconcilePrimaryPhase("apply", { ...options, request })
    expect(JSON.parse(String(request.mock.calls[2]?.[1]?.body))).toEqual({ database: { name: "matriz", owner_name: "neondb_owner" } })
    expect(JSON.parse(String(request.mock.calls[4]?.[1]?.body))).toEqual({ endpoint: { branch_id: "primary", type: "read_write" } })
  })

  it("does not create or inspect CI until primary phase has completed", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ branches: [{ id: "primary", name: "main", primary: true }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [{ name: "matriz" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ endpoints: [{ id: "ep-primary", branch_id: "primary", host: "primary.example", type: "read_write" }] })))
    await reconcilePrimaryPhase("apply", { ...options, request })
    expect(request.mock.calls.some(([url]) => String(url).includes("matriz-ci"))).toBe(false)
  })

  it("CI apply is resumable and idempotently creates branch, database and endpoint without synthesizing a URL", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ branches: [{ id: "primary", name: "main", primary: true }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ branch: { id: "ci", name: "matriz-ci" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ database: { name: "matriz" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ endpoints: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ endpoint: { id: "ep-ci", branch_id: "ci", project_id: "project", host: "ci.example", type: "read_write" } })))
    const result = await reconcileCiPhase("apply", { ...options, request })
    expect(result.endpointMetadata.host).toBe("ci.example")
    expect(JSON.stringify(request.mock.calls)).not.toContain("postgresql://")
  })

  it("verify SQL is SELECT-only and apply SQL enforces exact ACL/default ACL baseline", () => {
    const verify = buildVerificationSql()
    expect(verify).not.toMatch(/^\s*(CREATE|ALTER|GRANT|REVOKE|INSERT|UPDATE|DELETE|TRUNCATE)\b/gm)
    expect(verify).toContain("current_database() <> 'matriz'")
    expect(verify).toContain("pg_default_acl")
    expect(verify).toContain("runtime extra table ACL")
    const apply = buildProvisioningSql()
    expect(apply).toContain("REVOKE ALL ON ALL FUNCTIONS")
    expect(apply).toContain("FROM PUBLIC")
    expect(apply).toContain("ALTER DEFAULT PRIVILEGES")
    expect(apply).toContain("rogue_grant")
    expect(verify).toContain("unexpected grantee")
  })

  it("does not accept a read-only endpoint and creates a read-write endpoint in apply", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ branches: [{ id: "primary", name: "main", primary: true }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ databases: [{ name: "matriz" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ endpoints: [{ id: "ro", branch_id: "primary", host: "ro.example", type: "read_only" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ endpoint: { id: "rw", branch_id: "primary", project_id: "project", host: "rw.example", type: "read_write" } })))
    const result = await reconcilePrimaryPhase("apply", { ...options, request })
    expect(result.endpointMetadata.type).toBe("read_write")
    expect(JSON.parse(String(request.mock.calls[3]?.[1]?.body))).toEqual({ endpoint: { branch_id: "primary", type: "read_write" } })
  })
})
