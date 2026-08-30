import type { ManagedDatabaseSchema, MigrationGateStatus } from "./database-migration-gate"

export type DatabaseMigrationPreview = Readonly<{
  confirmationToken: string
  expiresAt: number
  title: string
  impact: readonly string[]
  schemas: readonly ManagedDatabaseSchema[]
}>

type Options = Readonly<{
  statuses(): Promise<readonly MigrationGateStatus[]>
  backup(): Promise<void>
  apply(schema: ManagedDatabaseSchema): Promise<void>
  now(): number
  token(): string
}>

type Pending = Readonly<{ expiresAt: number; schemas: readonly ManagedDatabaseSchema[] }>
const CONFIRMATION_TTL_MS = 5 * 60 * 1_000

export class DatabaseMigrationManager {
  private readonly pending = new Map<string, Pending>()

  constructor(private readonly options: Options) {}

  async preview(): Promise<DatabaseMigrationPreview> {
    const statuses = await this.options.statuses()
    assertApplicable(statuses)
    const migrations = statuses.reduce((count, status) => count + status.pending.length, 0)
    if (!migrations) throw new Error("There are no pending migrations")
    const schemas = statuses.filter((status) => status.pending.length).map((status) => status.schema)
    const confirmationToken = this.options.token()
    const expiresAt = this.options.now() + CONFIRMATION_TTL_MS
    this.pending.set(confirmationToken, { expiresAt, schemas })
    return {
      confirmationToken,
      expiresAt,
      title: `Aplicar ${migrations} migration${migrations === 1 ? "" : "s"} pendente${migrations === 1 ? "" : "s"}`,
      impact: [
        "Cria um backup de guarda antes de qualquer alteração.",
        "Aplica migrations explicitamente com a autoridade privilegiada de cada schema.",
        "Revalida checksums e bloqueia o lançamento se o ledger final não estiver limpo.",
      ],
      schemas,
    }
  }

  async confirm(confirmationToken: string): Promise<Readonly<{ state: "clean"; appliedSchemas: readonly ManagedDatabaseSchema[] }>> {
    const pending = this.pending.get(confirmationToken)
    if (!pending) throw new Error("Migration confirmation token is invalid or already used")
    this.pending.delete(confirmationToken)
    if (this.options.now() > pending.expiresAt) throw new Error("Migration confirmation token expired")
    const before = await this.options.statuses()
    assertApplicable(before)
    const currentSchemas = before.filter((status) => status.pending.length).map((status) => status.schema)
    if (currentSchemas.join("|") !== pending.schemas.join("|")) throw new Error("Migration plan changed after preview")
    await this.options.backup()
    for (const schema of pending.schemas) await this.options.apply(schema)
    const after = await this.options.statuses()
    if (after.some((status) => status.state !== "clean")) throw new Error("Migration verification did not produce clean ledgers")
    return { state: "clean", appliedSchemas: pending.schemas }
  }
}

function assertApplicable(statuses: readonly MigrationGateStatus[]): void {
  const blocked = statuses.find((status) => status.state === "drifted" || status.state === "failed")
  if (blocked) throw new Error(`Cannot apply migrations while ${blocked.schema} is ${blocked.state}`)
}
