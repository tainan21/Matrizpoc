import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { approveRecipe, createProjectRegistration } from "../domain/project"
import { computeRecipeRevision, type ProjectRecipeMaterial } from "../domain/recipe"
import { AtomicProjectStore } from "../integration/atomic-project-store"
import { ProjectSessionService } from "./project-session-service"

const dirs: string[] = []
afterEach(async () => { for (const path of dirs.splice(0)) await rm(path, { recursive: true, force: true }) })

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "matriz-session-")); dirs.push(dir)
  const store = new AtomicProjectStore(join(dir, "projects.json"))
  const material: ProjectRecipeMaterial = { detectors: [], prepareActions: [], runActions: [{ id: "run.dev", label: "Run", executable: "npm", args: ["run", "dev"], cwdRef: "root_1", allowedEnvironmentKeys: ["PORT"], requestedPorts: [{ port: 4100, environmentKey: "PORT" }], readiness: { kind: "http", path: "/health", timeoutMs: 100 }, lifecycle: "service" }], surfaces: [], permissions: ["project.process.start", "project.process.stop"] }
  const revision = computeRecipeRevision(material)
  const registration = approveRecipe(createProjectRegistration({ id: "project_1", displayName: "Demo", canonicalRootRef: "root_1", source: "local", recipeRevision: revision, now: "2026-08-27T12:00:00.000Z" }), revision, "2026-08-27T12:01:00.000Z")
  await store.save({ registration, canonicalPath: "C:\\Projects\\Demo", recipe: { ...material, revision }, sessions: [], preparationEvidence: null, surfacePreference: null, reconciliation: null })
  const starts: Array<{ projectId: string; actionId: string }> = []
  const sessions = new Map<string, { id: string; pid: number | null; status: string }>()
  const supervisor = {
    start: async (projectId: string, actionId: string) => { starts.push({ projectId, actionId }); const value = { id: "term_1", pid: 42, status: "running" }; sessions.set(value.id, value); return value },
    get: (id: string) => sessions.get(id),
    stop: async (id: string) => { const value = sessions.get(id); if (value) value.status = "exited" },
    restart: async () => ({ id: "term_2", pid: 43, status: "running" }),
  }
  const service = new ProjectSessionService({ store, supervisor, portAvailable: async () => true, readiness: { wait: async () => ({ state: "ready" as const, url: "http://127.0.0.1:4100/health" }) }, now: () => "2026-08-27T12:02:00.000Z" })
  return { service, store, revision, starts, sessions }
}

describe("ProjectSessionService", () => {
  it("starts only the stored action for the current reviewed revision", async () => {
    const { service, revision, starts } = await setup()
    await expect(service.start("project_1", "run.dev", "stale")).rejects.toThrow("Recipe revision is stale")
    const result = await service.start("project_1", "run.dev", revision)
    expect(result).toMatchObject({ state: "running", sessionId: "term_1", readinessUrl: "http://127.0.0.1:4100/health" })
    expect(starts).toEqual([{ projectId: "project_1", actionId: "run.dev" }])
  })

  it("refuses a foreign listener before starting", async () => {
    const context = await setup()
    const service = new ProjectSessionService({ store: context.store, supervisor: { start: async () => { throw new Error("must not start") }, get: () => undefined, stop: async () => undefined, restart: async () => { throw new Error("unused") } }, portAvailable: async () => false, readiness: { wait: async () => ({ state: "ready" as const }) }, now: () => "now" })
    await expect(service.start("project_1", "run.dev", context.revision)).rejects.toThrow("Expected port 4100 is already occupied by an external process")
  })

  it("refuses to start before ports or processes when the migration gate is not clean", async () => {
    const context = await setup()
    const portAvailable = vi.fn(async () => true)
    const start = vi.fn(async () => ({ id: "never", pid: 1, status: "running" }))
    const service = new ProjectSessionService({ store: context.store, supervisor: { start, get: () => undefined, stop: async () => undefined, restart: async () => { throw new Error("unused") } }, portAvailable, readiness: { wait: async () => ({ state: "ready" as const }) }, now: () => "now", dependencyGate: { assertProjectReady: async () => { throw new Error("Migration gate blocked spot: pending") } } })
    await expect(service.start("project_1", "run.dev", context.revision)).rejects.toThrow(/migration gate/i)
    expect(portAvailable).not.toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()
  })

  it("reconciles a disappeared persisted session to stopped", async () => {
    const { service, store, revision, sessions } = await setup()
    await service.start("project_1", "run.dev", revision)
    sessions.clear()
    await service.reconcile()
    const record = await store.findNative("project_1")
    expect(record?.sessions.at(-1)).toMatchObject({ state: "stopped", result: "process-disappeared" })
    expect(record?.reconciliation).toMatchObject({ state: "reconciled", reason: "process-disappeared" })
  })
})
