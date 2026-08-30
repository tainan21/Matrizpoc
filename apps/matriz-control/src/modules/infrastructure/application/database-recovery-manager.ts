export type DatabaseRecoveryAction = "backup" | "restore" | "recreate"

export interface DatabaseBackupSnapshot {
  readonly id: string
  readonly kind: "daily" | "guard"
  readonly createdAt: string
  readonly pinned: boolean
  readonly valid: boolean
  readonly bytes: number
  readonly sha256: string
}

export interface DatabaseRecoveryPreview {
  readonly confirmationToken: string
  readonly actionId: DatabaseRecoveryAction
  readonly backupId: string | null
  readonly title: string
  readonly impact: readonly string[]
  readonly expiresAt: number
}

export interface DatabaseRecoveryHost {
  list(): Promise<readonly DatabaseBackupSnapshot[]>
  execute(action: DatabaseRecoveryAction, backupId: string | null): Promise<void>
}

interface PendingRecovery {
  readonly action: DatabaseRecoveryAction
  readonly backupId: string | null
  readonly expiresAt: number
}

const BACKUP_ID_PATTERN = /^backup_\d{8}_[a-z0-9]{6,32}$/

export class DatabaseRecoveryManager {
  private readonly pending = new Map<string, PendingRecovery>()

  constructor(private readonly deps: { host: DatabaseRecoveryHost; now(): number; token(): string }) {}

  list(): Promise<readonly DatabaseBackupSnapshot[]> {
    return this.deps.host.list()
  }

  async preview(action: DatabaseRecoveryAction, backupId: string | null = null): Promise<DatabaseRecoveryPreview> {
    if (action === "backup" && backupId !== null) throw new Error("Backup does not accept a backup id")
    if (action !== "backup") await this.assertRestorable(backupId)

    const confirmationToken = this.deps.token()
    const expiresAt = this.deps.now() + 30_000
    this.pending.set(confirmationToken, { action, backupId, expiresAt })
    return {
      confirmationToken,
      actionId: action,
      backupId,
      title: action === "backup" ? "Criar backup de guarda" : action === "restore" ? "Restaurar backup validado" : "Recriar database Matriz",
      impact: recoveryImpact(action, backupId),
      expiresAt,
    }
  }

  async confirm(token: string): Promise<readonly DatabaseBackupSnapshot[]> {
    const pending = this.pending.get(token)
    if (!pending) throw new Error("Confirmation token is invalid or already used")
    this.pending.delete(token)
    if (this.deps.now() > pending.expiresAt) throw new Error("Confirmation token expired")
    if (pending.action !== "backup") await this.assertRestorable(pending.backupId)
    await this.deps.host.execute(pending.action, pending.backupId)
    return this.list()
  }

  private async assertRestorable(backupId: string | null): Promise<void> {
    if (!backupId || !BACKUP_ID_PATTERN.test(backupId)) throw new Error("Invalid backup id")
    const selected = (await this.list()).find((backup) => backup.id === backupId)
    if (!selected) throw new Error("Backup id is not present in the catalog")
    if (!selected.valid) throw new Error("Restore requires a valid backup")
  }
}

function recoveryImpact(action: DatabaseRecoveryAction, backupId: string | null): readonly string[] {
  if (action === "backup") return ["Database fixo: matriz em 127.0.0.1:55432", "Formato lógico PostgreSQL custom (-Fc)", "Nenhum caminho é aceito do renderer"]
  return [
    `Backup catalogado: ${backupId}`,
    "Restore validado primeiro em database temporário",
    "Database atual será mantido em quarentena",
    "PostgreSQL externo em 5432 permanece fora do escopo",
  ]
}
