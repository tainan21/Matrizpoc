import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { AppliedMigration, AppliedMigrationReader, ManagedDatabaseSchema } from "../src/modules/infrastructure/application/database-migration-gate"

const execFileAsync = promisify(execFile)

export class WindowsAppliedMigrationReader implements AppliedMigrationReader {
  constructor(private readonly helperPath: string) {}

  async read(schema: ManagedDatabaseSchema): Promise<readonly AppliedMigration[]> {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", this.helperPath, "-Schema", schema], { windowsHide: true, maxBuffer: 256 * 1024, timeout: 15_000 })
    return parseAppliedMigrations(stdout)
  }
}

export function parseAppliedMigrations(value: string): readonly AppliedMigration[] {
  const parsed: unknown = JSON.parse(value.trim() || "[]")
  if (!Array.isArray(parsed)) throw new Error("Migration ledger helper returned invalid data")
  return parsed.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Migration ledger helper returned invalid data")
    const record = item as Record<string, unknown>
    if (typeof record.name !== "string" || !/^\d{12,}_[a-z0-9_]+$/.test(record.name) || typeof record.checksum !== "string" || !/^[a-f0-9]{64}$/.test(record.checksum) || typeof record.finished !== "boolean" || typeof record.rolledBack !== "boolean") throw new Error("Migration ledger helper returned invalid data")
    return { name: record.name, checksum: record.checksum, finished: record.finished, rolledBack: record.rolledBack }
  })
}
