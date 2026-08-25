import { describe, expect, it } from "vitest"
import { GET } from "./route"

describe("Health liveness route", () => {
  it("identifies the app and reports an ok status", async () => {
    const response = GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ appId: "health", status: "ok" })
  })
})
