import { describe, expect, it } from "vitest"
import {
  getRequiredLocalToken,
  LOCAL_TEST_TOKEN,
  localSessionDigest,
  localTokenMatches,
} from "./local-access"

const configuredToken = "configured-local-token-123"

describe("local Workbench access", () => {
  it("accepts 1234 without configuration outside production", () => {
    const environment = { NODE_ENV: "development" }

    expect(getRequiredLocalToken(environment)).toBe(LOCAL_TEST_TOKEN)
    expect(localTokenMatches(LOCAL_TEST_TOKEN, environment)).toBe(true)
    expect(localSessionDigest(environment)).toHaveLength(64)
  })

  it("keeps accepting a configured strong token during development", () => {
    const environment = {
      NODE_ENV: "development",
      WORKBENCH_LOCAL_TOKEN: configuredToken,
    }

    expect(localTokenMatches(configuredToken, environment)).toBe(true)
    expect(localTokenMatches(LOCAL_TEST_TOKEN, environment)).toBe(true)
  })

  it("never accepts 1234 in production", () => {
    const environment = {
      NODE_ENV: "production",
      WORKBENCH_LOCAL_TOKEN: configuredToken,
    }

    expect(localTokenMatches(configuredToken, environment)).toBe(true)
    expect(localTokenMatches(LOCAL_TEST_TOKEN, environment)).toBe(false)
  })

  it("requires a configured strong token in production", () => {
    expect(() => getRequiredLocalToken({ NODE_ENV: "production" })).toThrow(
      "WORKBENCH_LOCAL_TOKEN ausente ou curto",
    )
    expect(() =>
      getRequiredLocalToken({
        NODE_ENV: "production",
        WORKBENCH_LOCAL_TOKEN: LOCAL_TEST_TOKEN,
      }),
    ).toThrow("WORKBENCH_LOCAL_TOKEN ausente ou curto")
  })
})
