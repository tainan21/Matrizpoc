import { describe, expect, it } from "vitest"
import { capsuleCapabilities, policyAllows } from "./capsule-policy.js"

describe("capsule policy", () => {
  it("keeps operator-only tools in human capsules", () => {
    expect(capsuleCapabilities("human")).toEqual({ automation: "none", downloads: true, devtools: true })
  })

  it("restricts agent-safe capsules to bounded browsing", () => {
    expect(capsuleCapabilities("agent-safe")).toEqual({ automation: "safe", downloads: false, devtools: false })
    expect(policyAllows("agent-safe", "downloads")).toBe(false)
    expect(policyAllows("agent-safe", "devtools")).toBe(false)
  })

  it("allows agent-full downloads without exposing operator devtools", () => {
    expect(capsuleCapabilities("agent-full")).toEqual({ automation: "full", downloads: true, devtools: false })
    expect(policyAllows("agent-full", "downloads")).toBe(true)
    expect(policyAllows("agent-full", "devtools")).toBe(false)
  })
})
