export interface MigrationFileDigest { readonly name: string; readonly checksum: string }
export interface AppliedMigration { readonly name: string; readonly checksum: string; readonly finished: boolean; readonly rolledBack: boolean }
export interface MigrationLedgerComparison {
  readonly state: "clean" | "pending" | "drifted" | "failed"
  readonly pending: readonly string[]
  readonly altered: readonly string[]
  readonly unexpected: readonly string[]
  readonly failed: readonly string[]
}

export function compareMigrationLedger(files: readonly MigrationFileDigest[], applied: readonly AppliedMigration[]): MigrationLedgerComparison {
  assertUnique(files.map((item) => item.name), "migration files")
  assertUnique(applied.map((item) => item.name), "applied migrations")
  const fileByName = new Map(files.map((item) => [item.name, item]))
  const appliedByName = new Map(applied.map((item) => [item.name, item]))
  const pending = files.filter((item) => !appliedByName.has(item.name)).map((item) => item.name)
  const altered = files.filter((item) => { const row = appliedByName.get(item.name); return row !== undefined && row.checksum.toLowerCase() !== item.checksum.toLowerCase() }).map((item) => item.name)
  const unexpected = applied.filter((item) => !fileByName.has(item.name) && !item.rolledBack).map((item) => item.name)
  const failed = applied.filter((item) => !item.finished && !item.rolledBack).map((item) => item.name)
  const state = failed.length ? "failed" : altered.length || unexpected.length ? "drifted" : pending.length ? "pending" : "clean"
  return { state, pending, altered, unexpected, failed }
}

function assertUnique(values: readonly string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`)
}
