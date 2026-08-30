import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { withTenantContext } from "../../packages/platform/db/src/tenant-context"

const schemas = ["core", "hub", "spot", "seumei", "contracts", "willdash", "ops", "pay"] as const
const tenantSchemas = new Set(["core", "hub", "spot", "seumei", "contracts", "willdash"])

describe("PostgreSQL V1 governance", () => {
  it("gives every domain a V1 release migration with deny-by-default runtime ACL", async () => {
    for (const schema of schemas) {
      const sql = await readFile(resolve(`prisma/${schema}/migrations/202608300001_local_infrastructure_v1/migration.sql`), "utf8")
      expect(sql).toContain(`SET search_path TO "${schema}"`)
      expect(sql).toContain(`matriz_${schema}_runtime`)
      expect(sql).toMatch(/REVOKE ALL ON ALL TABLES IN SCHEMA/)
      expect(sql).toContain("local-infrastructure-v1")
      if (tenantSchemas.has(schema)) {
        expect(sql).toContain("ENABLE ROW LEVEL SECURITY")
        expect(sql).toContain("FORCE ROW LEVEL SECURITY")
        expect(sql).toContain("current_setting(''matriz.tenant_id'', true)")
      } else {
        expect(sql).not.toContain("tenant_isolation")
      }
    }
  })

  it("sets tenant authority transaction-locally and never accepts an invalid identifier", async () => {
    const calls: unknown[][] = []
    const client = {
      $transaction: async <T>(work: (transaction: { $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown> }) => Promise<T>) => work({
        $executeRawUnsafe: async (...args: unknown[]) => { calls.push(args); return 1 },
      }),
    }
    await expect(withTenantContext(client, "tenant-a", async () => "ok")).resolves.toBe("ok")
    expect(calls).toEqual([["SELECT set_config('matriz.tenant_id', $1, true)", "tenant-a"]])
    await expect(withTenantContext(client, "tenant-a'; SET ROLE postgres; --", async () => "bad")).rejects.toThrow("Invalid tenant id")
  })

  it("contains no cross-schema foreign keys in domain migrations", async () => {
    for (const schema of schemas) {
      const prisma = await readFile(resolve(`prisma/${schema}/schema.prisma`), "utf8")
      expect(prisma).not.toMatch(/references\s+"?(core|hub|spot|seumei|contracts|willdash|ops|pay)"?\s*\./i)
    }
  })
})
