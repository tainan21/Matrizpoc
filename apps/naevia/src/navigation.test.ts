import { describe, expect, it } from "vitest"
import { navigationTarget } from "./navigation"

describe("navigationTarget", () => {
  it("normalizes URLs, loopback and searches", () => {
    expect(navigationTarget("example.com")).toBe("https://example.com/")
    expect(navigationTarget("localhost:3000/health")).toBe("http://localhost:3000/health")
    expect(navigationTarget("matriz browser")).toContain("duckduckgo.com/?q=matriz%20browser")
  })

  it("rejects privileged protocols and strips credentials", () => {
    expect(() => navigationTarget("file:///c:/secret.txt")).toThrow(/HTTP/)
    expect(navigationTarget("https://user:pass@example.com")).toBe("https://example.com/")
  })
})
