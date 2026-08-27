import { describe, expect, it } from "vitest"
import { computeRecipeRevision, type ProjectRecipeMaterial } from "./recipe"
import { PROJECT_PERMISSIONS, hasProjectPermission } from "./permissions"

const material = (): ProjectRecipeMaterial => ({
  detectors: [{ detector: "node", kind: "manifest", value: "package.json" }],
  prepareActions: [{ id: "prepare.npm", label: "Install", executable: "npm", args: ["ci"], cwdRef: "root", allowedEnvironmentKeys: [], requestedPorts: [], readiness: null, lifecycle: "one-shot" }],
  runActions: [{ id: "run.dev", label: "Start", executable: "npm", args: ["run", "dev"], cwdRef: "root", allowedEnvironmentKeys: ["PORT"], requestedPorts: [{ port: 4100, environmentKey: "PORT" }], readiness: { kind: "http", path: "/health", timeoutMs: 30_000 }, lifecycle: "service" }],
  surfaces: [{ id: "web", label: "Web", kind: "embedded-web", originPolicy: "exact-loopback", healthPath: "/health" }],
  permissions: ["project.inspect", "project.process.start"],
})

describe("project recipes", () => {
  it("computes the same SHA-256 revision for semantically equivalent key ordering", () => {
    const a = material()
    const b = JSON.parse(JSON.stringify(a)) as ProjectRecipeMaterial
    b.detectors = [{ value: "package.json", kind: "manifest", detector: "node" }]
    expect(computeRecipeRevision(a)).toMatch(/^[a-f0-9]{64}$/)
    expect(computeRecipeRevision(a)).toBe(computeRecipeRevision(b))
  })

  it("changes revision when executable authority changes", () => {
    const changed = material()
    changed.runActions[0] = { ...changed.runActions[0], args: ["run", "preview"] }
    expect(computeRecipeRevision(material())).not.toBe(computeRecipeRevision(changed))
  })
})

describe("project permissions", () => {
  it("keeps every capability independent", () => {
    expect(PROJECT_PERMISSIONS).toEqual([
      "project.inspect", "project.register", "project.dependencies.install", "project.process.start",
      "project.process.stop", "project.surface.embed", "project.surface.open_external", "project.logs.read",
      "project.environment.use_secret_ref", "project.docker.operate",
    ])
    expect(hasProjectPermission(["project.inspect"], "project.inspect")).toBe(true)
    expect(hasProjectPermission(["project.inspect"], "project.process.start")).toBe(false)
  })
})
