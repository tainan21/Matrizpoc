import { describe, expect, it } from "vitest"
import type { ProjectFileEvidence } from "../ports"
import { detectNodeProject } from "./node-project-detector"

const file = (relativePath: string, content = ""): ProjectFileEvidence => ({ relativePath, content, size: Buffer.byteLength(content) })

describe("Node project detector", () => {
  it.each([
    ["pnpm-lock.yaml", "corepack", ["pnpm", "install", "--frozen-lockfile"]],
    ["package-lock.json", "npm", ["ci"]],
    ["bun.lock", "bun", ["install", "--frozen-lockfile"]],
  ] as const)("materializes a review candidate for %s", (lockfile, executable, args) => {
    const candidate = detectNodeProject([
      file("package.json", JSON.stringify({ name: "demo", scripts: { dev: "next dev -p 4100" }, engines: { node: ">=20" } })),
      file(lockfile, "lock"),
    ])
    expect(candidate.status).toBe("candidate")
    expect(candidate.prepareActions[0]).toMatchObject({ executable, args, lifecycle: "one-shot" })
    expect(candidate.runActions[0]).toMatchObject({ id: "run.dev", requestedPorts: [{ port: 4100, environmentKey: "PORT" }] })
    expect(candidate.warnings).toContain("Package-manager lifecycle scripts may execute during preparation.")
    expect(candidate.detectors).toContainEqual({ detector: "node", kind: "engine", value: ">=20" })
  })

  it("blocks conflicting package managers instead of choosing silently", () => {
    const candidate = detectNodeProject([file("package.json", '{"scripts":{"dev":"node server.js"}}'), file("pnpm-lock.yaml"), file("package-lock.json")])
    expect(candidate.status).toBe("blocked")
    expect(candidate.conflicts).toEqual(["Multiple package managers detected: npm, pnpm"])
    expect(candidate.prepareActions).toEqual([])
  })

  it("reports a manifest without runnable scripts as needing review", () => {
    const candidate = detectNodeProject([file("package.json", '{"name":"library"}'), file("package-lock.json")])
    expect(candidate.status).toBe("needs_review")
    expect(candidate.runActions).toEqual([])
  })

  it("rejects malformed package JSON", () => {
    expect(() => detectNodeProject([file("package.json", "not-json")])).toThrow("Invalid package.json")
  })
})
