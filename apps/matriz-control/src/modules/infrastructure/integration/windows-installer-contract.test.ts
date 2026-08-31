import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { MATRIZ_SERVICE_CATALOG } from "../domain/service-catalog"

describe("Windows infrastructure installer contract", () => {
  it("pins official artifacts and never targets the external PostgreSQL port", () => {
    for (const artifact of MATRIZ_SERVICE_CATALOG.flatMap((service) => service.artifact ? [service.artifact] : [])) {
      expect(artifact.url).toMatch(/^https:\/\/github\.com\/(microsoft\/garnet|nats-io\/nats-server)\/releases\/download\//)
      expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(artifact.bytes).toBeGreaterThan(1_000_000)
    }
    expect(MATRIZ_SERVICE_CATALOG.flatMap((service) => service.ports)).not.toContain(5432)
  })

  it("uses fixed service names, delayed start, loopback listeners and virtual accounts", async () => {
    const helper = await readFile(resolve(process.cwd(), "desktop/infrastructure-helper.ps1"), "utf8")
    for (const name of ["MatrizPostgres17", "MatrizGarnet", "MatrizNats"]) {
      expect(helper).toContain(name)
      expect(helper).toContain(`NT SERVICE\\${name}`)
    }
    expect(helper).toContain("start= delayed-auto")
    expect(helper).toContain("listen_addresses = '127.0.0.1'")
    expect(helper).toContain("host: 127.0.0.1")
    expect(helper).toContain("--bind 127.0.0.1")
    expect(helper).not.toMatch(/\b5432\b/)
    expect(helper).not.toContain("Invoke-Expression")
  })

  it("configures Garnet ACLs without putting cache passwords in service arguments", async () => {
    const helper = await readFile(resolve(process.cwd(), "desktop/infrastructure-helper.ps1"), "utf8")
    expect(helper).toContain("--auth ACL")
    expect(helper).toContain("--acl-file")
    expect(helper).toContain("--storage-tier --aof --recover --logdir")
    expect(helper).toContain("user default off")
    expect(helper).toContain("-@all +get +set +del +expire +ping")
    expect(helper).not.toContain("~matriz:v1:matriz-hub:*")
    expect(helper).toContain("cache-roles.dpapi")
    expect(helper).not.toMatch(/--password\s/)
  })

  it("configures an authenticated Pay JetStream publisher with subject-scoped permissions", async () => {
    const helper = await readFile(resolve(process.cwd(), "desktop/infrastructure-helper.ps1"), "utf8")
    const credentialHelper = await readFile(resolve(process.cwd(), "desktop/nats-credential-helper.ps1"), "utf8")
    expect(credentialHelper).toContain("nats-roles.dpapi")
    expect(credentialHelper).toContain("ConvertFrom-SecureString")
    expect(helper).toContain("PayNatsPasswordHash")
    expect(helper).toContain("ControlNatsPasswordHash")
    expect(helper).toContain('user: `"matriz_control`"')
    expect(helper).toContain('user: `"matriz_pay`"')
    expect(helper).toContain('publish: [`"matriz.v1.pay.>`"]')
    expect(helper).toContain('subscribe: [`"_INBOX.>`"]')
    expect(helper).not.toContain("$payNatsPassword")
    expect(helper).not.toContain("authorization: { token:")
  })
})
