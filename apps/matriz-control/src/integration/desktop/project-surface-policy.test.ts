import { describe, expect, it } from "vitest"
import { assessEmbedding, isAllowedSurfaceNavigation, resolveApprovedSurfaceUrl } from "./project-surface-policy"

describe("project surface policy", () => {
  it("resolves only an exact loopback origin from an approved port and path", () => {
    expect(resolveApprovedSurfaceUrl(4100, "/app")).toEqual({ url: "http://127.0.0.1:4100/app", origin: "http://127.0.0.1:4100" })
    expect(() => resolveApprovedSurfaceUrl(0, "/")).toThrow("Invalid approved surface port")
    expect(() => resolveApprovedSurfaceUrl(4100, "https://evil.test")).toThrow("Invalid surface path")
    expect(() => resolveApprovedSurfaceUrl(4100, "//evil.test")).toThrow("Invalid surface path")
  })

  it.each([
    ["http://127.0.0.1:4100/next", true],
    ["http://localhost:4100/next", false],
    ["http://127.0.0.1:4200/next", false],
    ["file:///C:/secret", false],
    ["javascript:alert(1)", false],
    ["data:text/html,bad", false],
    ["https://example.test", false],
  ])("checks navigation %s", (candidate, expected) => {
    expect(isAllowedSurfaceNavigation(candidate, "http://127.0.0.1:4100")).toBe(expected)
  })

  it("falls back for X-Frame-Options and incompatible CSP", () => {
    expect(assessEmbedding({ "x-frame-options": "DENY" })).toEqual({ compatible: false, reason: "x-frame-options" })
    expect(assessEmbedding({ "x-frame-options": "SAMEORIGIN" })).toEqual({ compatible: false, reason: "x-frame-options" })
    expect(assessEmbedding({ "content-security-policy": "default-src 'self'; frame-ancestors 'none'" })).toEqual({ compatible: false, reason: "csp-frame-ancestors" })
    expect(assessEmbedding({ "content-security-policy": "frame-ancestors http://127.0.0.1:4100" })).toEqual({ compatible: false, reason: "csp-frame-ancestors" })
    expect(assessEmbedding({ "content-type": "text/html" })).toEqual({ compatible: true })
  })
})
