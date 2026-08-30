import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Windows local environment helper contract", () => {
  it("uses CurrentUser DPAPI, atomic writes and exact managed endpoints", async () => {
    const helper = await readFile(resolve(process.cwd(), "desktop/local-environment-helper.ps1"), "utf8")
    expect(helper).toContain("ConvertFrom-SecureString")
    expect(helper).not.toMatch(/-Key\s|-SecureKey\s/)
    expect(helper).toContain("Move-Item -LiteralPath $temporary -Destination $path -Force")
    expect(helper).toContain("127.0.0.1:55432")
    expect(helper).toContain("redis://127.0.0.1:46379")
    expect(helper).toContain("http://127.0.0.1:8080")
    expect(helper).toContain("http://127.0.0.1:3012")
    expect(helper).toContain("service::matriz-ops::matriz-pay")
    expect(helper).toContain("New-TotpSecret")
    expect(helper).toContain("identity::local-owner-totp")
    expect(helper).not.toContain("Invoke-Expression")
    expect(helper).not.toMatch(/Write-(Host|Verbose|Debug)/)
  })

  it("accepts only a validated contract file and never receives secret values in arguments", async () => {
    const helper = await readFile(resolve(process.cwd(), "desktop/local-environment-helper.ps1"), "utf8")
    const parameters = helper.slice(0, helper.indexOf("\n)") + 2)
    expect(helper).toContain("[ValidatePattern('^[a-z0-9][a-z0-9-]*$')]")
    expect(helper).toContain("infrastructure.json")
    expect(parameters).not.toMatch(/Password|Secret|Token/i)
  })
})
