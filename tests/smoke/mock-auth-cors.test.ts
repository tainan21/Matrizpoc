import { describe, expect, it } from "vitest"
import { getMockAuthCorsHeaders, isAllowedMockAuthOrigin } from "../../apps/matriz-hub/src/auth/mock-auth-cors"

describe("mock auth CORS", () => {
  it("allows credentialed requests only from the five authenticated localhost apps", () => {
    for (let port = 3000; port <= 3004; port += 1) {
      expect(isAllowedMockAuthOrigin(`http://localhost:${port}`)).toBe(true)
    }
    expect(isAllowedMockAuthOrigin("http://127.0.0.1:3000")).toBe(false)
    expect(isAllowedMockAuthOrigin("http://localhost:3005")).toBe(false)
    expect(isAllowedMockAuthOrigin("https://example.com")).toBe(false)
  })

  it("echoes the allowed origin and enables credentials", () => {
    expect(getMockAuthCorsHeaders("http://localhost:3002")).toMatchObject({
      "access-control-allow-origin": "http://localhost:3002",
      "access-control-allow-credentials": "true",
    })
    expect(getMockAuthCorsHeaders("https://example.com")["access-control-allow-origin"]).toBeUndefined()
  })
})
