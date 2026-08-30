import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Windows packaged migration apply contract", () => {
  it("uses per-schema migration authority, immutable checksums and one transaction", async () => {
    const helper = await readFile(resolve(process.cwd(), "desktop/database-migration-apply-helper.ps1"), "utf8")
    expect(helper).toContain('matriz_${Schema}_migration')
    expect(helper).toContain("database-roles.dpapi")
    expect(helper).toContain("Get-FileHash")
    expect(helper).toContain("--single-transaction")
    expect(helper).toContain("_prisma_migrations")
    expect(helper).toContain("A failed migration requires explicit resolution")
    expect(helper).toContain("Schema is preprovisioned and owned by the migration role")
    expect(helper).toContain('SET search_path TO')
    expect(helper).not.toContain("Invoke-Expression")
    expect(helper).not.toMatch(/['\"]5432['\"]/)
  })

  it("is included as an immutable desktop resource", async () => {
    const packageJson = JSON.parse(await readFile(resolve(process.cwd(), "package.json"), "utf8")) as { build: { extraResources: { from: string; to: string }[] } }
    expect(packageJson.build.extraResources).toContainEqual({ from: "desktop/database-migration-apply-helper.ps1", to: "database-migration-apply-helper.ps1" })
  })
})
