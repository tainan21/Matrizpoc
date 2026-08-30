import { describe, expect, it } from "vitest"
import { WindowsDatabaseMigrationHost } from "./windows-database-migration-host"

describe("WindowsDatabaseMigrationHost", () => {
  it("passes only a closed schema and the fixed packaged root to PowerShell", async () => {
    const calls: { file: string; args: readonly string[] }[] = []
    const host = new WindowsDatabaseMigrationHost({
      helperPath: "C:/Program Files/Matriz/database-migration-apply-helper.ps1",
      migrationsRoot: "C:/Program Files/Matriz/resources/prisma",
      execute: async (file, args) => { calls.push({ file, args }) },
    })
    await host.apply("core")
    expect(calls).toEqual([{ file: "powershell.exe", args: ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", "C:/Program Files/Matriz/database-migration-apply-helper.ps1", "-Schema", "core", "-MigrationsRoot", "C:/Program Files/Matriz/resources/prisma"] }])
  })

  it("returns a sanitized error instead of PowerShell output", async () => {
    const host = new WindowsDatabaseMigrationHost({ helperPath: "helper.ps1", migrationsRoot: "prisma", execute: async () => { throw new Error("postgresql://role:secret@host database payload") } })
    await expect(host.apply("pay")).rejects.toThrow("Managed migration apply failed for pay")
  })
})
