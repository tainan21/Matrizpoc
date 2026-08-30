import { join } from "node:path"

export const MATRIZ_SCHEMAS = ["core", "hub", "spot", "seumei", "contracts", "willdash", "ops", "pay"] as const

export interface LocalDatabaseConnection {
  readonly host: "127.0.0.1"
  readonly port: 55432
  readonly database: string
  readonly username: string
  readonly password: string
}

export interface DatabaseInvocation {
  readonly executable: string
  readonly args: readonly string[]
  readonly environment: Readonly<Record<string, string>>
}

type DatabaseOperation = "backup" | "restore"

export function databaseCommand(
  operation: DatabaseOperation,
  connection: LocalDatabaseConnection,
  input: { readonly postgresBin: string; readonly output?: string; readonly input?: string },
): DatabaseInvocation {
  assertManagedConnection(connection)
  const common = ["--host", connection.host, "--port", String(connection.port), "--username", connection.username, "--dbname", connection.database, "--no-password"]
  if (operation === "backup") {
    if (!input.output) throw new Error("Backup output is required")
    return { executable: join(input.postgresBin, "pg_dump.exe"), args: [...common, "--format=custom", "--compress=9", "--file", input.output], environment: { PGPASSWORD: connection.password } }
  }
  if (!/^matriz_restore_[a-z0-9]{6,64}$/.test(connection.database)) throw new Error("Restore must target a temporary restore database")
  if (!input.input) throw new Error("Restore input is required")
  return { executable: join(input.postgresBin, "pg_restore.exe"), args: [...common, "--exit-on-error", "--clean", "--if-exists", input.input], environment: { PGPASSWORD: connection.password } }
}

function assertManagedConnection(connection: LocalDatabaseConnection) {
  if (connection.host !== "127.0.0.1") throw new Error("Database operations require the managed loopback host")
  if (connection.port !== 55432) throw new Error("Database operations require managed port 55432")
  if (!/^matriz(?:_restore_[a-z0-9]{6,64})?$/.test(connection.database)) throw new Error("Database name is outside the managed topology")
}

export interface BackupManifestV1 {
  readonly schemaVersion: "v1"
  readonly postgresVersion: string
  readonly sha256: string
  readonly bytes: number
  readonly createdAt: string
  readonly schemas: readonly ["core", "hub", "spot", "seumei", "contracts", "willdash", "ops", "pay"]
  readonly migrations: Readonly<Record<string, readonly string[]>>
}

export function createBackupManifest(input: Omit<BackupManifestV1, "schemaVersion">): BackupManifestV1 {
  return validateBackupManifest({ schemaVersion: "v1", ...input })
}

export function validateBackupManifest(value: unknown): BackupManifestV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid backup manifest")
  const manifest = value as Record<string, unknown>
  const exactKeys = ["schemaVersion", "postgresVersion", "sha256", "bytes", "createdAt", "schemas", "migrations"]
  const migrationsValid = manifest.migrations !== null && typeof manifest.migrations === "object" && !Array.isArray(manifest.migrations)
    && Object.values(manifest.migrations).every((items) => Array.isArray(items) && items.every((item) => typeof item === "string" && item.length > 0))
  const valid = Object.keys(manifest).length === exactKeys.length && exactKeys.every((key) => key in manifest)
    && manifest.schemaVersion === "v1"
    && typeof manifest.postgresVersion === "string" && /^17\.\d+(?:\.\d+)?$/.test(manifest.postgresVersion)
    && typeof manifest.sha256 === "string" && /^[a-f0-9]{64}$/.test(manifest.sha256)
    && typeof manifest.bytes === "number" && Number.isInteger(manifest.bytes) && manifest.bytes > 0
    && typeof manifest.createdAt === "string" && !Number.isNaN(Date.parse(manifest.createdAt))
    && Array.isArray(manifest.schemas) && manifest.schemas.length === MATRIZ_SCHEMAS.length && manifest.schemas.every((schema, index) => schema === MATRIZ_SCHEMAS[index])
    && migrationsValid
  if (!valid) throw new Error("Invalid backup manifest")
  return value as BackupManifestV1
}
