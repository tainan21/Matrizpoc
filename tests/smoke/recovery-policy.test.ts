import { describe, expect, it } from "vitest"
import { planRestore, selectPrunableBackups, type BackupRecord } from "../../tooling/local-infrastructure/recovery-policy"

const record = (id: string, day: number, overrides: Partial<BackupRecord> = {}): BackupRecord => ({ id, kind: "daily", createdAt: `2026-08-${String(day).padStart(2, "0")}T12:00:00.000Z`, pinned: false, valid: true, ...overrides })

describe("database recovery policy", () => {
  it("keeps seven newest daily backups and never prunes pins or invalid evidence", () => {
    const records = Array.from({ length: 10 }, (_, index) => record(`daily-${index + 1}`, index + 1))
    records.push(record("pin", 1, { pinned: true }), record("invalid", 1, { valid: false }))
    expect(selectPrunableBackups(records).map((item) => item.id)).toEqual(["daily-1", "daily-2", "daily-3"])
  })

  it("creates a temporary validation target and quarantine name from a catalog id", () => {
    expect(planRestore({ backupId: "backup_20260830_ab12cd", valid: true, now: "2026-08-30T18:00:00.000Z" })).toEqual({
      backupId: "backup_20260830_ab12cd",
      temporaryDatabase: "matriz_restore_ab12cd",
      quarantineDatabase: "matriz_quarantine_20260830t180000000z",
      steps: ["stop_apps", "restore_temporary", "validate", "quarantine_current", "promote_restored", "reprovision_roles", "health_gate"],
    })
    expect(() => planRestore({ backupId: "C:\\attacker.dump", valid: true, now: "2026-08-30T18:00:00.000Z" })).toThrow(/backup id/i)
    expect(() => planRestore({ backupId: "backup_20260830_ab12cd", valid: false, now: "2026-08-30T18:00:00.000Z" })).toThrow(/valid backup/i)
  })
})
