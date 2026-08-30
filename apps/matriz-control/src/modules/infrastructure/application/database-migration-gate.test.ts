import { createHash } from "node:crypto"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { DatabaseMigrationGate, type AppliedMigrationReader } from "./database-migration-gate"

const checksum = (value: string) => createHash("sha256").update(value).digest("hex")

async function fixture(databaseRequired = true) {
  const root = await mkdtemp(join(tmpdir(), "matriz-migration-gate-"))
  const migrationsRoot = join(root, "prisma")
  const migration = join(migrationsRoot, "spot", "migrations", "001_base")
  await mkdir(migration, { recursive: true })
  await writeFile(join(migration, "migration.sql"), "SELECT 1;", "utf8")
  await writeFile(join(root, "infrastructure.json"), JSON.stringify({ schemaVersion: "v1", appId: "spot", database: { required: databaseRequired, schema: databaseRequired ? "spot" : undefined } }), "utf8")
  return { root, migrationsRoot }
}

describe("database migration launch gate", () => {
  it("accepts a clean ledger and tooling apps without a database", async () => {
    const files = await fixture()
    const reader: AppliedMigrationReader = { read: vi.fn(async () => [{ name: "001_base", checksum: checksum("SELECT 1;"), finished: true, rolledBack: false }]) }
    const gate = new DatabaseMigrationGate({ reader, migrationsRoot: files.migrationsRoot })
    await expect(gate.assertProjectReady(files.root)).resolves.toBeUndefined()
    const tooling = await fixture(false)
    await expect(gate.assertProjectReady(tooling.root)).resolves.toBeUndefined()
  })

  it("blocks pending, altered, failed and unexpected migrations", async () => {
    const files = await fixture()
    for (const applied of [
      [],
      [{ name: "001_base", checksum: checksum("tampered"), finished: true, rolledBack: false }],
      [{ name: "001_base", checksum: checksum("SELECT 1;"), finished: false, rolledBack: false }],
      [{ name: "001_base", checksum: checksum("SELECT 1;"), finished: true, rolledBack: false }, { name: "999_manual", checksum: checksum("x"), finished: true, rolledBack: false }],
    ]) {
      const gate = new DatabaseMigrationGate({ reader: { read: async () => applied }, migrationsRoot: files.migrationsRoot })
      await expect(gate.assertProjectReady(files.root)).rejects.toThrow(/migration gate/i)
    }
  })
})
