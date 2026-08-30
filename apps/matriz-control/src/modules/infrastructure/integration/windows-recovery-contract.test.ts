import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Windows database recovery helper contract", () => {
  it("uses only the managed database and catalog backup ids", async () => {
    const helper = await readFile(resolve(process.cwd(), "desktop/database-recovery-helper.ps1"), "utf8")
    expect(helper).toContain("127.0.0.1")
    expect(helper).toContain("55432")
    expect(helper).toContain("pg_dump")
    expect(helper).toContain("pg_restore")
    expect(helper).toContain("matriz_restore_")
    expect(helper).toContain("matriz_quarantine_")
    expect(helper).toMatch(/backup_\\d\{8\}_\[a-z0-9\]/)
    expect(helper).not.toMatch(/\b5432\b/)
    expect(helper).not.toContain("Invoke-Expression")
    expect(helper).not.toContain("RandomNumberGenerator]::GetBytes")
    expect(helper).not.toMatch(/\[string\]\$Path\b/)
    expect(helper).toContain("Select-Object -Skip 7")
    expect(helper).toContain("DailyBackup")
  })

  it("checks the dump checksum and validates before promoting", async () => {
    const helper = await readFile(resolve(process.cwd(), "desktop/database-recovery-helper.ps1"), "utf8")
    const checksum = helper.indexOf("Get-FileHash")
    const temporary = helper.indexOf("restore_temporary")
    const validate = helper.indexOf("validate_temporary")
    const promote = helper.indexOf("promote_restored")
    expect(checksum).toBeGreaterThan(0)
    expect(temporary).toBeGreaterThan(checksum)
    expect(validate).toBeGreaterThan(temporary)
    expect(promote).toBeGreaterThan(validate)
  })

  it("installs a fixed daily task under the installer account", async () => {
    const installer = await readFile(resolve(process.cwd(), "desktop/infrastructure-helper.ps1"), "utf8")
    expect(installer).toContain("MatrizDatabaseDailyBackup")
    expect(installer).toContain("-Action DailyBackup")
    expect(installer).toContain("-LogonType Interactive")
    expect(installer).toContain("database-recovery-helper.ps1")
    expect(installer).not.toContain("RandomNumberGenerator]::GetBytes")
  })
})
