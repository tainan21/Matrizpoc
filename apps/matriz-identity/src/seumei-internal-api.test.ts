import { describe, expect, it } from "vitest"
import { authorizeSeumeiService } from "./seumei-internal-api"

describe("Seumei internal API service authentication", () => {
  const token = "s".repeat(32)

  it("requires both the bound caller and constant-time bearer secret", () => {
    expect(authorizeSeumeiService({ authorization: `Bearer ${token}`, "x-matriz-app-id": "seumei" }, token)).toBe(true)
    expect(authorizeSeumeiService({ authorization: `Bearer ${token}`, "x-matriz-app-id": "matriz-hub" }, token)).toBe(false)
    expect(authorizeSeumeiService({ authorization: "Bearer wrong", "x-matriz-app-id": "seumei" }, token)).toBe(false)
    expect(authorizeSeumeiService({ "x-matriz-app-id": "seumei" }, token)).toBe(false)
  })
})
