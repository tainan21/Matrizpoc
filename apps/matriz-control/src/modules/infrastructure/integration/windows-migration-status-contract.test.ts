import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Windows migration status helper", () => {
  it("reads only the fixed managed ledger and never accepts SQL or paths", async () => {
    const helper = await readFile(resolve(process.cwd(), "desktop/database-migration-status-helper.ps1"), "utf8")
    expect(helper).toContain("ValidateSet('core','hub','spot','seumei','contracts','willdash','ops','pay')")
    expect(helper).toContain("127.0.0.1")
    expect(helper).toContain("55432")
    expect(helper).toContain("_prisma_migrations")
    expect(helper).not.toMatch(/\b5432\b/)
    expect(helper).not.toContain("Invoke-Expression")
    expect(helper).not.toMatch(/\[string\]\$(Sql|Path|Host|Port)\b/)
  })
})
