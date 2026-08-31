import { describe, expect, it } from "vitest"
import { trustedWebOrigin } from "./connection"
describe("desktop web origin", () => {
  it("accepts production HTTPS and local development only", () => {
    expect(trustedWebOrigin("https://admin.example.com", "production")).toBe("https://admin.example.com/")
    expect(trustedWebOrigin("http://127.0.0.1:3013", "development")).toBe("http://127.0.0.1:3013/")
    expect(() => trustedWebOrigin("http://admin.example.com", "production")).toThrow()
    expect(() => trustedWebOrigin("javascript:alert(1)", "production")).toThrow()
  })
})
