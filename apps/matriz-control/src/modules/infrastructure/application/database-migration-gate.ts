import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

export type ManagedDatabaseSchema = "core" | "hub" | "spot" | "seumei" | "contracts" | "willdash" | "ops" | "pay"
export interface AppliedMigration { readonly name: string; readonly checksum: string; readonly finished: boolean; readonly rolledBack: boolean }
export interface AppliedMigrationReader { read(schema: ManagedDatabaseSchema): Promise<readonly AppliedMigration[]> }
export interface MigrationGateStatus { readonly schema: ManagedDatabaseSchema; readonly state: "clean" | "pending" | "drifted" | "failed"; readonly pending: readonly string[]; readonly altered: readonly string[]; readonly unexpected: readonly string[]; readonly failed: readonly string[] }

const schemas = new Set<ManagedDatabaseSchema>(["core", "hub", "spot", "seumei", "contracts", "willdash", "ops", "pay"])

export class DatabaseMigrationGate {
  constructor(private readonly deps: { reader: AppliedMigrationReader; migrationsRoot: string }) {}

  async assertProjectReady(projectRoot: string): Promise<void> {
    let source: string
    try { source = await readFile(join(projectRoot, "infrastructure.json"), "utf8") }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error }
    const contract = JSON.parse(source) as { database?: { required?: unknown; schema?: unknown } }
    if (contract.database?.required !== true) return
    if (typeof contract.database.schema !== "string" || !schemas.has(contract.database.schema as ManagedDatabaseSchema)) throw new Error("Migration gate cannot resolve the managed database schema")
    const status = await this.status(contract.database.schema as ManagedDatabaseSchema)
    if (status.state !== "clean") throw new Error(`Migration gate blocked ${status.schema}: ${status.state}`)
  }

  async status(schema: ManagedDatabaseSchema): Promise<MigrationGateStatus> {
    const directory = join(this.deps.migrationsRoot, schema, "migrations")
    const entries = (await readdir(directory, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    const files = await Promise.all(entries.map(async (name) => ({ name, checksum: createHash("sha256").update(await readFile(join(directory, name, "migration.sql"))).digest("hex") })))
    const applied = await this.deps.reader.read(schema)
    assertUnique(files.map((item) => item.name))
    assertUnique(applied.map((item) => item.name))
    const expected = new Map(files.map((item) => [item.name, item.checksum]))
    const actual = new Map(applied.map((item) => [item.name, item]))
    const pending = files.filter((item) => !actual.has(item.name)).map((item) => item.name)
    const altered = files.filter((item) => actual.has(item.name) && actual.get(item.name)?.checksum.toLowerCase() !== item.checksum).map((item) => item.name)
    const unexpected = applied.filter((item) => !expected.has(item.name) && !item.rolledBack).map((item) => item.name)
    const failed = applied.filter((item) => !item.finished && !item.rolledBack).map((item) => item.name)
    const state = failed.length ? "failed" as const : altered.length || unexpected.length ? "drifted" as const : pending.length ? "pending" as const : "clean" as const
    return { schema, state, pending, altered, unexpected, failed }
  }
}

function assertUnique(names: readonly string[]) {
  if (new Set(names).size !== names.length) throw new Error("Migration gate found duplicate migration names")
}
