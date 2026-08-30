import { describe, expect, it } from "vitest"
import { assertLocalSeedEnvironment, LOCAL_SEED_DATABASE_KEYS } from "../../tooling/local-infrastructure/local-seed-policy"

function environment(url = "postgresql://role:secret@127.0.0.1:55432/matriz?schema=core") {
  return Object.fromEntries([["MATRIZ_ENVIRONMENT", "local"], ...LOCAL_SEED_DATABASE_KEYS.map((key) => [key, url])])
}

describe("local development seed policy", () => {
  it("accepts only all eight managed loopback database URLs", () => {
    expect(assertLocalSeedEnvironment(environment())).toHaveLength(8)
    for (const invalid of [
      "postgresql://role:secret@127.0.0.1:5432/matriz?schema=core",
      "postgresql://role:secret@localhost:55432/matriz?schema=core",
      "postgresql://role:secret@cloud.example:55432/matriz?schema=core",
      "postgresql://role:secret@127.0.0.1:55432/other?schema=core",
    ]) expect(() => assertLocalSeedEnvironment(environment(invalid))).toThrow(/managed local database/i)
  })

  it("fails closed outside the explicit local profile or with a missing role URL", () => {
    expect(() => assertLocalSeedEnvironment({ ...environment(), MATRIZ_ENVIRONMENT: "production" })).toThrow(/local profile/i)
    const missing = environment()
    delete missing.PAY_DATABASE_URL
    expect(() => assertLocalSeedEnvironment(missing)).toThrow(/PAY_DATABASE_URL/)
  })
})
