import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import { compareMigrationLedger, type AppliedMigration } from "../../tooling/local-infrastructure/migration-ledger"

const sha = (text: string) => createHash("sha256").update(text).digest("hex")

describe("migration ledger", () => {
  it("classifies clean, pending, altered and unexpected migrations", () => {
    const files = [
      { name: "001_base", checksum: sha("base") },
      { name: "002_rls", checksum: sha("rls") },
    ]
    const clean: AppliedMigration[] = files.map((file) => ({ name: file.name, checksum: file.checksum, finished: true, rolledBack: false }))
    expect(compareMigrationLedger(files, clean)).toEqual({ state: "clean", pending: [], altered: [], unexpected: [], failed: [] })
    expect(compareMigrationLedger(files, clean.slice(0, 1))).toMatchObject({ state: "pending", pending: ["002_rls"] })
    expect(compareMigrationLedger(files, [{ ...clean[0]!, checksum: sha("tampered") }, clean[1]!])).toMatchObject({ state: "drifted", altered: ["001_base"] })
    expect(compareMigrationLedger(files, [...clean, { name: "999_manual", checksum: sha("x"), finished: true, rolledBack: false }])).toMatchObject({ state: "drifted", unexpected: ["999_manual"] })
    expect(compareMigrationLedger(files, [{ ...clean[0]!, finished: false }, clean[1]!])).toMatchObject({ state: "failed", failed: ["001_base"] })
  })

  it("rejects duplicate migration names before comparison", () => {
    expect(() => compareMigrationLedger([{ name: "001", checksum: sha("a") }, { name: "001", checksum: sha("b") }], [])).toThrow(/duplicate/i)
  })
})
