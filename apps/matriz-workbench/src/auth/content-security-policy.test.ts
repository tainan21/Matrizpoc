import { describe, expect, it } from "vitest"
import { buildContentSecurityPolicy } from "./content-security-policy"

const nonce = "MDEyMzQ1Njc4OWFiY2RlZg=="

describe("buildContentSecurityPolicy", () => {
  it("builds an enforced production policy without unsafe script fallbacks", () => {
    const policy = buildContentSecurityPolicy(nonce)

    expect(policy).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`)
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("connect-src 'self'")
    expect(policy).not.toContain("'unsafe-eval'")
    expect(policy).not.toContain("script-src 'unsafe-inline'")
    expect(policy).not.toContain("http:")
    expect(policy).not.toContain("https:")
  })

  it("allows only the development runtime additions when explicitly requested", () => {
    const policy = buildContentSecurityPolicy(nonce, { development: true })

    expect(policy).toContain("'unsafe-eval'")
    expect(policy).toContain("connect-src 'self' ws: wss:")
    expect(policy).toContain(`'nonce-${nonce}'`)
  })

  it("rejects malformed nonces before creating a header", () => {
    expect(() => buildContentSecurityPolicy("bad nonce; script-src *"))
      .toThrow("Invalid CSP nonce.")
  })
})
