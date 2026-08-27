import { describe, expect, it } from "vitest"
import { createProjectRegistration } from "../domain/project"
import type { NativeProjectRecord } from "../integration/atomic-project-store"
import { presentProject } from "./project-presenter"

function record(state: NativeProjectRecord["registration"]["state"] = "needs_review"): NativeProjectRecord {
  return {
    registration: { ...createProjectRegistration({ id: "project_1", displayName: "Demo", canonicalRootRef: "root_1", source: "local", recipeRevision: "rev_1", now: "2026-08-27T12:00:00.000Z" }), state },
    canonicalPath: "C:\\Users\\Taina\\Projects\\secret-demo",
    recipe: {
      revision: "rev_1",
      detectors: [{ detector: "node", kind: "package-manager", value: "npm" }],
      prepareActions: [{ id: "prepare.npm", label: "Install", executable: "npm", args: ["ci"], cwdRef: "root_1", allowedEnvironmentKeys: [], requestedPorts: [], readiness: null, lifecycle: "one-shot" }],
      runActions: [{ id: "run.dev", label: "Start", executable: "npm", args: ["run", "dev"], cwdRef: "root_1", allowedEnvironmentKeys: ["PORT", "TOKEN"], requestedPorts: [{ port: 4100, environmentKey: "PORT" }], readiness: { kind: "http", path: "/health", timeoutMs: 30_000 }, lifecycle: "service" }],
      surfaces: [{ id: "web", label: "Web", kind: "embedded-web", originPolicy: "exact-loopback", healthPath: "/health" }],
      permissions: ["project.inspect", "project.process.start", "project.logs.read"],
    },
    sessions: [{ sessionId: "term_1", projectId: "project_1", actionId: "run.dev", recipeRevision: "rev_1", pid: 42, expectedPorts: [4100], state: "running", startedAt: "2026-08-27T12:01:00.000Z", endedAt: null, result: "TOKEN=synthetic" }],
    preparationEvidence: null,
    surfacePreference: null,
    reconciliation: null,
  }
}

describe("project presenter", () => {
  it.each([
    ["unknown", "Estado desconhecido"], ["inspecting", "Inspecionando"], ["needs_review", "Revisão necessária"],
    ["ready", "Pronto"], ["preparing", "Preparando"], ["starting", "Iniciando"], ["running", "Em execução"],
    ["degraded", "Degradado"], ["stopping", "Parando"], ["stopped", "Parado"], ["blocked", "Bloqueado"], ["failed", "Falhou"],
  ] as const)("labels %s", (state, label) => expect(presentProject(record(state)).stateLabel).toBe(label))

  it("produces a path-free operational ViewModel with redacted bounded sessions", () => {
    const view = presentProject(record("running"))
    expect(view).toMatchObject({ id: "project_1", name: "Demo", stackLabel: "Node · npm", trustLabel: "Não revisada", attention: "none", recipeRevision: "rev_1" })
    expect(view.runActions[0]).toMatchObject({ id: "run.dev", commandPreview: "npm run dev", cwdLabel: "project-root", environmentKeys: ["PORT", "TOKEN"], ports: [4100] })
    expect(view.sessions[0]).toMatchObject({ id: "term_1", state: "running", result: "TOKEN=[redacted]" })
    expect(JSON.stringify(view)).not.toContain("Taina")
    expect(JSON.stringify(view)).not.toContain("secret-demo")
  })
})
