import { describe, expect, it } from "vitest"
import { decideNavigation } from "./navigation-policy"

const allowedOrigins = ["https://seumei.matriz.example", "https://hub.matriz.example"]

describe("decideNavigation", () => {
  it("keeps configured Seumei and Hub pages inside the shell", () => {
    expect(decideNavigation("https://seumei.matriz.example/workspace", allowedOrigins)).toBe("in-app")
    expect(decideNavigation("https://hub.matriz.example/login?returnTo=%2Fworkspace", allowedOrigins)).toBe("in-app")
  })

  it("sends ordinary external HTTPS links to the system browser", () => {
    expect(decideNavigation("https://docs.example.com/guide", allowedOrigins)).toBe("external")
  })

  it("denies unsafe, malformed, and lookalike URLs", () => {
    expect(decideNavigation("javascript:alert(1)", allowedOrigins)).toBe("deny")
    expect(decideNavigation("file:///C:/secret.txt", allowedOrigins)).toBe("deny")
    expect(decideNavigation("https://seumei.matriz.example.attacker.test", allowedOrigins)).toBe("external")
    expect(decideNavigation("not a url", allowedOrigins)).toBe("deny")
  })
})
