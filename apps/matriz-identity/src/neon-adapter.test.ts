import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createNeonAdapterFactory, type SqlExecutor } from "./neon-adapter"

describe("oidc Neon adapter", () => {
  it("persists, consumes and deletes opaque provider payloads with bound parameters", async () => {
    const calls: Array<{ text: string; values: readonly unknown[] }> = []
    const sql: SqlExecutor = {
      query: async <T extends Record<string, unknown>>(text: string, values: readonly unknown[] = []) => {
        calls.push({ text, values })
        if (text.includes('SELECT "payload"')) return { rows: [{ payload: { accountId: "u1" } } as unknown as T] }
        return { rows: [] }
      },
    }
    const Adapter = createNeonAdapterFactory(sql)
    const adapter = new Adapter("RefreshToken")

    await adapter.upsert("token-1", { accountId: "u1", grantId: "grant-1" }, 60)
    expect(await adapter.find("token-1")).toEqual({ accountId: "u1" })
    await adapter.consume("token-1")
    await adapter.revokeByGrantId("grant-1")

    expect(calls.every((call) => !call.text.includes("token-1"))).toBe(true)
    expect(calls.some((call) => call.values.includes("token-1"))).toBe(true)
  })

  it("rejects unknown oidc-provider model names", () => {
    const Adapter = createNeonAdapterFactory({ query: async () => ({ rows: [] }) })
    expect(() => new Adapter("../../unsafe")).toThrow(/model/i)
  })

  it("uses the quoted camelCase columns declared by the Core migration", async () => {
    const statements: string[] = []
    const Adapter = createNeonAdapterFactory({ query: async (text) => { statements.push(text); return { rows: [] } } })
    const adapter = new Adapter("RefreshToken")
    await adapter.upsert("id", { grantId: "g" }, 60)
    await adapter.consume("id")
    await adapter.revokeByGrantId("g")
    const sql = statements.join("\n")
    const migration = readFileSync(resolve(import.meta.dirname, "../../../prisma/core/migrations/202608120006_oidc_artifacts/migration.sql"), "utf8")
    for (const column of ["grantId", "userCode", "expiresAt", "consumedAt"]) {
      expect(migration).toContain(`"${column}"`)
      expect(sql).toContain(`"${column}"`)
    }
    expect(sql).not.toMatch(/grant_id|user_code|expires_at|consumed_at/)
  })
})
