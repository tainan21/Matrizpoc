import { describe, expect, it, vi } from "vitest"
import type { MigrationGateStatus } from "./database-migration-gate"
import { DatabaseMigrationManager } from "./database-migration-manager"

const pending: MigrationGateStatus = { schema: "core", state: "pending", pending: ["001_init"], altered: [], unexpected: [], failed: [] }
const clean: MigrationGateStatus = { ...pending, state: "clean", pending: [] }

describe("DatabaseMigrationManager", () => {
  it("backs up, applies only pending schemas and verifies the final gate", async () => {
    let applied = false
    const backup = vi.fn(async () => undefined)
    const apply = vi.fn(async () => { applied = true })
    const manager = new DatabaseMigrationManager({
      statuses: async () => [applied ? clean : pending],
      backup,
      apply,
      now: () => 1_000,
      token: () => "migration_confirm_1",
    })
    await expect(manager.preview()).resolves.toEqual({
      confirmationToken: "migration_confirm_1",
      expiresAt: 301_000,
      title: "Aplicar 1 migration pendente",
      impact: ["Cria um backup de guarda antes de qualquer alteração.", "Aplica migrations explicitamente com a autoridade privilegiada de cada schema.", "Revalida checksums e bloqueia o lançamento se o ledger final não estiver limpo."],
      schemas: ["core"],
    })
    await expect(manager.confirm("migration_confirm_1")).resolves.toEqual({ state: "clean", appliedSchemas: ["core"] })
    expect(backup).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledWith("core")
  })

  it("refuses drift, failed ledgers and no-op runs", async () => {
    for (const status of [{ ...pending, state: "drifted" as const, altered: ["001_init"], pending: [] }, { ...pending, state: "failed" as const, failed: ["001_init"], pending: [] }]) {
      const manager = new DatabaseMigrationManager({ statuses: async () => [status], backup: async () => undefined, apply: async () => undefined, now: Date.now, token: () => "token" })
      await expect(manager.preview()).rejects.toThrow(/cannot apply/i)
    }
    const manager = new DatabaseMigrationManager({ statuses: async () => [clean], backup: async () => undefined, apply: async () => undefined, now: Date.now, token: () => "token" })
    await expect(manager.preview()).rejects.toThrow(/no pending migrations/i)
  })

  it("consumes and expires confirmation tokens", async () => {
    let now = 0
    const manager = new DatabaseMigrationManager({ statuses: async () => [pending], backup: async () => undefined, apply: async () => undefined, now: () => now, token: () => "token" })
    await manager.preview()
    now = 300_001
    await expect(manager.confirm("token")).rejects.toThrow(/expired/i)
    await expect(manager.confirm("token")).rejects.toThrow(/invalid or already used/i)
  })
})
