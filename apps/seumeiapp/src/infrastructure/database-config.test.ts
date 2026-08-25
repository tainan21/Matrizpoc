import { describe, expect, it } from "vitest"
import { resolveDatabaseAvailability } from "./database-config"

describe("resolveDatabaseAvailability", () => {
  it("reports every missing app datasource explicitly", () => {
    expect(resolveDatabaseAvailability({})).toEqual({
      kind: "unavailable",
      missing: ["CORE_DATABASE_URL", "SEUMEI_DATABASE_URL"],
    })
  })

  it("reports only the missing datasource", () => {
    expect(
      resolveDatabaseAvailability({
        CORE_DATABASE_URL: "postgresql://core",
      }),
    ).toEqual({ kind: "unavailable", missing: ["SEUMEI_DATABASE_URL"] })
  })

  it("accepts one explicitly configured shared datasource", () => {
    expect(
      resolveDatabaseAvailability({ DATABASE_URL: "postgresql://shared" }),
    ).toEqual({ kind: "ready" })
  })

  it("accepts dedicated Core and Seumei datasources", () => {
    expect(
      resolveDatabaseAvailability({
        CORE_DATABASE_URL: "postgresql://core",
        SEUMEI_DATABASE_URL: "postgresql://seumei",
      }),
    ).toEqual({ kind: "ready" })
  })

  it("treats blank variables as absent", () => {
    expect(
      resolveDatabaseAvailability({
        CORE_DATABASE_URL: " ",
        SEUMEI_DATABASE_URL: "",
      }),
    ).toEqual({
      kind: "unavailable",
      missing: ["CORE_DATABASE_URL", "SEUMEI_DATABASE_URL"],
    })
  })
})
