import { describe, expect, it } from "vitest"
import { parseBackupCatalog } from "./windows-database-recovery-host"

describe("Windows database recovery host", () => {
  it("accepts only a bounded sanitized native catalog", () => {
    const value = parseBackupCatalog(JSON.stringify([{ id: "backup_20260830_ab12cd", kind: "guard", createdAt: "2026-08-30T12:00:00.000Z", pinned: false, valid: true, bytes: 42, sha256: "a".repeat(64) }]))
    expect(value).toHaveLength(1)
    expect(() => parseBackupCatalog(JSON.stringify([{ ...value[0], id: "C:\\attacker.dump" }]))).toThrow(/invalid backup/i)
    expect(() => parseBackupCatalog(JSON.stringify({ path: "C:\\attacker.dump" }))).toThrow(/invalid catalog/i)
  })
})
