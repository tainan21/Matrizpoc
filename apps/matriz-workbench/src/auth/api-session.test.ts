import { describe, expect, it } from "vitest"
import { apiStatusForWorkspaceError } from "./api-error-status"

describe("apiStatusForWorkspaceError", () => {
  it("maps local capacity limits to HTTP 429", async () => {
    expect(apiStatusForWorkspaceError(
      { code: "RATE_LIMITED" },
    )).toBe(429)
  })
})
