import { describe, expect, it } from "vitest"
import { parseAppliedMigrations } from "./windows-applied-migration-reader"

describe("Windows applied migration reader", () => {
  it("accepts only sanitized Prisma migration rows", () => {
    const row = { name: "202608300001_local_infrastructure_v1", checksum: "a".repeat(64), finished: true, rolledBack: false }
    expect(parseAppliedMigrations(JSON.stringify([row]))).toEqual([row])
    expect(() => parseAppliedMigrations(JSON.stringify([{ ...row, name: "../evil" }]))).toThrow(/invalid data/i)
    expect(() => parseAppliedMigrations(JSON.stringify([{ ...row, checksum: "secret" }]))).toThrow(/invalid data/i)
  })
})
