import { describe, expect, it } from "vitest"
import { createBackupManifest, databaseCommand, validateBackupManifest } from "../../tooling/local-infrastructure/database-operations"

const connection = { host: "127.0.0.1" as const, port: 55432 as const, database: "matriz", username: "matriz_provisioner", password: "top-secret" }

describe("local database operation plans", () => {
  it("creates fixed binary invocations without putting secrets in args", () => {
    const dump = databaseCommand("backup", connection, { postgresBin: "C:\\Program Files\\PostgreSQL\\17\\bin", output: "C:\\ProgramData\\Matriz\\Infrastructure\\backups\\daily.dump" })
    expect(dump.executable).toBe("C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe")
    expect(dump.args).toContain("--format=custom")
    expect(dump.args.join(" ")).not.toContain("top-secret")
    expect(dump.environment).toEqual({ PGPASSWORD: "top-secret" })
    expect(() => databaseCommand("backup", { ...connection, port: 5432 as 55432 }, { postgresBin: "bin", output: "x" })).toThrow(/55432/)
    expect(() => databaseCommand("backup", { ...connection, host: "db.example.com" as "127.0.0.1" }, { postgresBin: "bin", output: "x" })).toThrow(/loopback/)
  })

  it("uses temporary restore databases and refuses replacing matriz directly", () => {
    const restore = databaseCommand("restore", { ...connection, database: "matriz_restore_abc123" }, { postgresBin: "C:\\pg", input: "backup.dump" })
    expect(restore.executable).toBe("C:\\pg\\pg_restore.exe")
    expect(restore.args).toContain("--exit-on-error")
    expect(() => databaseCommand("restore", connection, { postgresBin: "C:\\pg", input: "backup.dump" })).toThrow(/temporary restore database/i)
  })

  it("validates immutable backup metadata and checksum shape", () => {
    const manifest = createBackupManifest({ postgresVersion: "17.4", sha256: "a".repeat(64), bytes: 42, createdAt: "2026-08-30T12:00:00.000Z", schemas: ["core", "hub", "spot", "seumei", "contracts", "willdash", "ops", "pay"], migrations: { core: ["m1"] } })
    expect(validateBackupManifest(manifest)).toEqual(manifest)
    expect(() => validateBackupManifest({ ...manifest, sha256: "broken" })).toThrow(/manifest/i)
    expect(() => validateBackupManifest({ ...manifest, schemas: ["core"] })).toThrow(/manifest/i)
  })
})
