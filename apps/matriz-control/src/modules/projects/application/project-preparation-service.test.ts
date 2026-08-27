import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { approveRecipe, createProjectRegistration } from "../domain/project"
import { computeRecipeRevision, type ProjectAction, type ProjectRecipeMaterial } from "../domain/recipe"
import { AtomicProjectStore } from "../integration/atomic-project-store"
import { ProjectPreparationService } from "./project-preparation-service"

const dirs: string[] = []
afterEach(async () => { for (const path of dirs.splice(0)) await rm(path, { recursive: true, force: true }) })

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "matriz-prepare-")); dirs.push(dir)
  const store = new AtomicProjectStore(join(dir, "projects.json"))
  const action: ProjectAction = { id: "prepare.npm", label: "Install dependencies", executable: "npm", args: ["ci"], cwdRef: "root_1", allowedEnvironmentKeys: [], requestedPorts: [], readiness: null, lifecycle: "one-shot" }
  const material: ProjectRecipeMaterial = { detectors: [], prepareActions: [action], runActions: [], surfaces: [], permissions: ["project.dependencies.install"] }
  const revision = computeRecipeRevision(material)
  const registration = approveRecipe(createProjectRegistration({ id: "project_1", displayName: "Demo", canonicalRootRef: "root_1", source: "local", recipeRevision: revision, now: "2026-08-27T12:00:00.000Z" }), revision, "2026-08-27T12:01:00.000Z")
  await store.save({ registration, canonicalPath: "C:\\Projects\\Demo", recipe: { ...material, revision }, sessions: [], preparationEvidence: null, surfacePreference: null, reconciliation: null })
  let now = 1_000
  const executed: ProjectAction[] = []
  const service = new ProjectPreparationService({ store, now: () => now, token: () => "confirmation_1", execute: async (resolved) => { executed.push(resolved); return { exitCode: 0 } } })
  return { service, store, revision, executed, advance(ms: number) { now += ms } }
}

describe("ProjectPreparationService", () => {
  it("previews the exact approved action and lifecycle warning", async () => {
    const { service, revision, executed } = await setup()
    const preview = await service.preview("project_1", revision)
    expect(preview).toEqual({ projectId: "project_1", recipeRevision: revision, actionId: "prepare.npm", executable: "npm", args: ["ci"], workingDirectory: "project-root", expectedDiskChanges: ["Project-local dependency files may change."], warning: "Package-manager lifecycle scripts may execute.", confirmationToken: "confirmation_1", expiresAt: 121_000 })
    expect(executed).toEqual([])
  })

  it("executes only once and stores preparation evidence", async () => {
    const { service, store, revision, executed } = await setup()
    const preview = await service.preview("project_1", revision)
    await service.prepare("project_1", revision, preview.confirmationToken)
    expect(executed).toEqual([{ id: "prepare.npm", label: "Install dependencies", executable: "npm", args: ["ci"], cwdRef: "root_1", allowedEnvironmentKeys: [], requestedPorts: [], readiness: null, lifecycle: "one-shot" }])
    await expect(service.prepare("project_1", revision, preview.confirmationToken)).rejects.toThrow("Preparation confirmation is invalid or already used")
    expect((await store.findNative("project_1"))?.preparationEvidence).toEqual({ recipeRevision: revision, completedAt: "1970-01-01T00:00:01.000Z", exitCode: 0 })
  })

  it("rejects expired, stale, and cross-project confirmations", async () => {
    const { service, revision, advance } = await setup()
    const preview = await service.preview("project_1", revision)
    advance(120_001)
    await expect(service.prepare("project_1", revision, preview.confirmationToken)).rejects.toThrow("Preparation confirmation expired")
    await expect(service.preview("project_1", "stale")).rejects.toThrow("Recipe revision is stale")
    const fresh = await service.preview("project_1", revision)
    await expect(service.prepare("project_2", revision, fresh.confirmationToken)).rejects.toThrow("Preparation confirmation does not match project and recipe")
  })
})
