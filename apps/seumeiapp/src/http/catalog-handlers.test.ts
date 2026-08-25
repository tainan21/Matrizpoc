import { describe, expect, it } from "vitest"
import { createProductHandler } from "./catalog-handlers"

describe("catalog HTTP boundary", () => {
  it("rejects browser tenant authority before resolving services", async () => {
    const result = await createProductHandler({ sessionUserId: "user", name: "A", email: "a@b.test" }, "company_a", { tenantId: "tenant_b", name: "X" }, {} as never)
    expect(result).toEqual({ status: 400, body: { error: "invalid_request" } })
  })
})
