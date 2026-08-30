export interface BackupRecord {
  id: string
  kind: "daily" | "guard"
  createdAt: string
  pinned: boolean
  valid: boolean
}

export interface RestorePlan {
  backupId: string
  temporaryDatabase: string
  quarantineDatabase: string
  steps: readonly [
    "stop_apps",
    "restore_temporary",
    "validate",
    "quarantine_current",
    "promote_restored",
    "reprovision_roles",
    "health_gate",
  ]
}

const BACKUP_ID_PATTERN = /^backup_\d{8}_([a-z0-9]{6,32})$/

export function selectPrunableBackups(records: readonly BackupRecord[]): BackupRecord[] {
  const dailyBackups = records
    .filter((record) => record.kind === "daily" && !record.pinned && record.valid)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))

  return dailyBackups.slice(0, Math.max(0, dailyBackups.length - 7))
}

export function planRestore(input: { backupId: string; valid: boolean; now: string }): RestorePlan {
  const match = BACKUP_ID_PATTERN.exec(input.backupId)
  if (!match) {
    throw new Error("Invalid backup id")
  }
  if (!input.valid) {
    throw new Error("Restore requires a valid backup")
  }

  const timestamp = new Date(input.now)
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Restore timestamp must be valid")
  }

  const normalizedTimestamp = timestamp.toISOString().replace(/[-:.]/g, "").toLowerCase()

  return {
    backupId: input.backupId,
    temporaryDatabase: `matriz_restore_${match[1]}`,
    quarantineDatabase: `matriz_quarantine_${normalizedTimestamp}`,
    steps: [
      "stop_apps",
      "restore_temporary",
      "validate",
      "quarantine_current",
      "promote_restored",
      "reprovision_roles",
      "health_gate",
    ],
  }
}
