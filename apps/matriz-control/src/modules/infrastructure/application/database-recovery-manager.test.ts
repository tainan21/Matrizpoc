import { describe, expect, it, vi } from "vitest"
import { DatabaseRecoveryManager, type DatabaseRecoveryHost } from "./database-recovery-manager"

const backup = {
  id: "backup_20260830_ab12cd",
  kind: "daily" as const,
  createdAt: "2026-08-30T12:00:00.000Z",
  pinned: false,
  valid: true,
  bytes: 42,
  sha256: "a".repeat(64),
}

function host(): DatabaseRecoveryHost {
  return { list: vi.fn(async () => [backup]), execute: vi.fn(async () => undefined) }
}

describe("database recovery manager", () => {
  it("uses a one-use confirmation bound to a catalog backup id", async () => {
    const native = host()
    const manager = new DatabaseRecoveryManager({ host: native, now: () => 1_000, token: () => "recover_1" })
    const preview = await manager.preview("restore", backup.id)
    expect(preview).toMatchObject({ actionId: "restore", backupId: backup.id, confirmationToken: "recover_1", expiresAt: 31_000 })
    await manager.confirm("recover_1")
    expect(native.execute).toHaveBeenCalledWith("restore", backup.id)
    await expect(manager.confirm("recover_1")).rejects.toThrow(/already used/i)
  })

  it("rejects invalid, unknown and corrupt backup ids before mutation", async () => {
    const native = host()
    const manager = new DatabaseRecoveryManager({ host: native, now: () => 1_000, token: () => "recover" })
    await expect(manager.preview("restore", "C:\\attacker.dump")).rejects.toThrow(/backup id/i)
    await expect(manager.preview("restore", "backup_20260830_ffffff")).rejects.toThrow(/catalog/i)
    native.list = vi.fn(async () => [{ ...backup, valid: false }])
    await expect(manager.preview("recreate", backup.id)).rejects.toThrow(/valid backup/i)
    expect(native.execute).not.toHaveBeenCalled()
  })

  it("creates a guard backup without accepting an input path", async () => {
    const native = host()
    const manager = new DatabaseRecoveryManager({ host: native, now: () => 1_000, token: () => "backup_1" })
    const preview = await manager.preview("backup")
    await manager.confirm(preview.confirmationToken)
    expect(native.execute).toHaveBeenCalledWith("backup", null)
  })
})
