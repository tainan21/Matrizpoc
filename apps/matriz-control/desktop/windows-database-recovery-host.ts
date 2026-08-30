import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type {
  DatabaseBackupSnapshot,
  DatabaseRecoveryHostAction,
  DatabaseRecoveryHost,
} from "../src/modules/infrastructure/application/database-recovery-manager"

const execFileAsync = promisify(execFile)
const BACKUP_ID_PATTERN = /^backup_\d{8}_[a-z0-9]{6,32}$/

export class WindowsDatabaseRecoveryHost implements DatabaseRecoveryHost {
  constructor(private readonly helperPath: string) {
    if (process.platform !== "win32") throw new Error("Matriz database recovery requires Windows")
  }

  async list(): Promise<readonly DatabaseBackupSnapshot[]> {
    return this.run("List", null)
  }

  async execute(action: DatabaseRecoveryHostAction, backupId: string | null): Promise<void> {
    const nativeAction = action === "backup" ? "Backup" : action === "daily" ? "DailyBackup" : action === "restore" ? "Restore" : "Recreate"
    await this.run(nativeAction, backupId)
  }

  private async run(action: "List" | "Backup" | "DailyBackup" | "Restore" | "Recreate", backupId: string | null): Promise<readonly DatabaseBackupSnapshot[]> {
    if (backupId !== null && !BACKUP_ID_PATTERN.test(backupId)) throw new Error("Invalid backup id")
    const args = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", this.helperPath, "-Action", action]
    if (backupId) args.push("-BackupId", backupId)
    const { stdout } = await execFileAsync("powershell.exe", args, {
      windowsHide: true,
      env: process.env,
      maxBuffer: 256 * 1024,
      timeout: action === "List" ? 15_000 : 10 * 60_000,
    })
    return parseBackupCatalog(stdout)
  }
}

export function parseBackupCatalog(value: string): readonly DatabaseBackupSnapshot[] {
  const parsed: unknown = JSON.parse(value.trim() || "[]")
  if (!Array.isArray(parsed)) throw new Error("Recovery helper returned an invalid catalog")
  return parsed.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Recovery helper returned an invalid backup")
    const record = item as Record<string, unknown>
    if (typeof record.id !== "string" || !BACKUP_ID_PATTERN.test(record.id)
      || (record.kind !== "daily" && record.kind !== "guard")
      || typeof record.createdAt !== "string" || Number.isNaN(Date.parse(record.createdAt))
      || typeof record.pinned !== "boolean" || typeof record.valid !== "boolean"
      || typeof record.bytes !== "number" || !Number.isSafeInteger(record.bytes) || record.bytes < 0
      || typeof record.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(record.sha256)) {
      throw new Error("Recovery helper returned an invalid backup")
    }
    return { id: record.id, kind: record.kind, createdAt: record.createdAt, pinned: record.pinned, valid: record.valid, bytes: record.bytes, sha256: record.sha256 }
  })
}
