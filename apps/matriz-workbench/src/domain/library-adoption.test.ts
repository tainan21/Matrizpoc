import { describe, expect, it } from "vitest"
import { libraryAdoptionPolicySchema } from "./library-adoption"

const valid = {
  schemaVersion: 1,
  sourceId: "matriz-lib-ui",
  distribution: {
    channel: "github_packages",
    registry: "https://npm.pkg.github.com",
    coordinatedReleases: true,
  },
  packages: [{
    name: "@matriz/tokens",
    status: "candidate",
    allowedSubpaths: [".", "./css"],
    requiredChecks: ["build", "typecheck"],
    blockers: ["No coordinated release"],
    evidence: ["apps/matriz-workbench/docs/MATRIZ-LIB-UI-ADOPTION-AUDIT-2026-07-30.md"],
  }],
}

describe("libraryAdoptionPolicySchema", () => {
  it("accepts a bounded portable policy", () => {
    expect(libraryAdoptionPolicySchema.parse(valid).sourceId).toBe("matriz-lib-ui")
  })

  it.each([
    { ...valid, sourceId: "../outside" },
    { ...valid, distribution: { ...valid.distribution, registry: "file:C:/secret" } },
    { ...valid, packages: [{ ...valid.packages[0], allowedSubpaths: ["../src"] }] },
    { ...valid, packages: [{ ...valid.packages[0], evidence: ["C:/secret.md"] }] },
    { ...valid, packages: [{ ...valid.packages[0], evidence: ["C:secret.md"] }] },
  ])("rejects non-portable input", (input) => {
    expect(() => libraryAdoptionPolicySchema.parse(input)).toThrow()
  })

  it.each([
    { ...valid, token: "should-not-be-accepted" },
    { ...valid, absolutePath: "C:/external-library" },
    {
      ...valid,
      distribution: {
        ...valid.distribution,
        token: "should-not-be-accepted",
      },
    },
    {
      ...valid,
      distribution: {
        ...valid.distribution,
        absolutePath: "C:/external-library",
      },
    },
    {
      ...valid,
      packages: [{
        ...valid.packages[0],
        token: "should-not-be-accepted",
      }],
    },
    {
      ...valid,
      packages: [{
        ...valid.packages[0],
        absolutePath: "C:/external-library",
      }],
    },
  ])("rejects unknown sensitive keys", (input) => {
    expect(() => libraryAdoptionPolicySchema.parse(input)).toThrow()
  })
})
