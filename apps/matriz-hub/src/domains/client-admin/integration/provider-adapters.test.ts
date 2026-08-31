import { describe, expect, it } from "vitest"
import { createGa4Adapter, createVercelAdapter } from "./provider-adapters"

describe("Client Admin provider adapters", () => {
  it("treats missing Vercel configuration as not configured", async () => {
    expect(await createVercelAdapter({}, async () => { throw new Error("must not fetch") }).refresh()).toMatchObject({ state: "not_configured", payload: null })
  })

  it("returns a sanitized unavailable result after Vercel failure", async () => {
    const result = await createVercelAdapter({ CLIENT_ADMIN_VERCEL_TOKEN: "secret", CLIENT_ADMIN_VERCEL_PROJECT_IDS: "site" }, async () => { throw new Error("token secret leaked") }).refresh()
    expect(result).toMatchObject({ state: "unavailable", errorCode: "VERCEL_UNAVAILABLE" })
    expect(JSON.stringify(result)).not.toContain("secret leaked")
  })

  it("accepts a configured GA4 response without exposing credentials", async () => {
    const result = await createGa4Adapter({ CLIENT_ADMIN_GA4_PROPERTY_ID: "123", CLIENT_ADMIN_GA4_ACCESS_TOKEN: "private" }, async () => new Response(JSON.stringify({ rows: [{ metricValues: [{ value: "42" }] }] }), { status: 200 })).refresh()
    expect(result).toMatchObject({ state: "fresh", payload: { sessions: 42 } })
    expect(JSON.stringify(result)).not.toContain("private")
  })
})
