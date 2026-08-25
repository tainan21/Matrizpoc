import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = resolve(process.cwd(), "../..")
const schema = readFileSync(resolve(root, "prisma/schemas/seumei.prisma"), "utf8")
const migration = readFileSync(resolve(root, "prisma/migrations/seumei/202608240004_store_identity_publication/migration.sql"), "utf8")

describe("Seumei store identity persistence contract", () => {
  it("adds validated draft state and immutable publication versions", () => {
    expect(schema).toContain("enum StoreIdentityPreset")
    expect(schema).toContain("model StorePublicationVersion {")
    expect(schema).toContain("draftPreset")
    expect(schema).toContain("publishedVersionId")
    expect(schema).toContain("@@unique([tenantId, publicationId, version])")
  })

  it("backfills current public stores without exposing a blank identity", () => {
    expect(migration).toContain("INSERT INTO \"store_publication_versions\"")
    expect(migration).toContain("COALESCE(description")
    expect(migration).toContain("publishedVersionId")
    expect(migration).toContain("FOREIGN KEY (\"tenantId\", \"publishedVersionId\")")
  })
})
