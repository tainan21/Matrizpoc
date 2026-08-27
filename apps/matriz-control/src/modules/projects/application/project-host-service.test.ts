import { describe, expect, it } from "vitest"
import type { ProjectFileEvidence, ProjectRootStorePort } from "../ports"
import { AtomicProjectStore } from "../integration/atomic-project-store"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ProjectHostService } from "./project-host-service"

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "matriz-host-service-"))
  let evidence: ProjectFileEvidence[] = [
    { relativePath: "package.json", content: '{"name":"demo","scripts":{"dev":"next dev -p 4100"}}', size: 60 },
    { relativePath: "package-lock.json", content: "{}", size: 2 },
  ]
  const roots: ProjectRootStorePort = {
    registerCandidate: async (candidateId) => candidateId === "candidate_1" ? { rootRef: "root_1", canonicalPath: "C:\\Projects\\Demo", displayName: "Demo" } : Promise.reject(new Error("Unknown root candidate")),
    resolve: async () => "C:\\Projects\\Demo",
    remove: async () => undefined,
  }
  const store = new AtomicProjectStore(join(dir, "projects.json"))
  const service = new ProjectHostService({ roots, reader: { readEvidence: async () => evidence }, store, id: () => "project_1", now: () => "2026-08-27T12:00:00.000Z", desktop: true })
  return { service, store, cleanup: () => rm(dir, { recursive: true, force: true }), changeEvidence(value: ProjectFileEvidence[]) { evidence = value } }
}

describe("ProjectHostService", () => {
  it("registers an inspected root as needs_review without preparing or starting", async () => {
    const context = await setup()
    try {
      const project = await context.service.registerCandidate("candidate_1")
      expect(project).toMatchObject({ id: "project_1", canonicalRootRef: "root_1", trust: "unreviewed", state: "needs_review" })
      expect(JSON.stringify(project)).not.toContain("C:\\Projects")
      const [native] = await context.store.listNative()
      expect(native.recipe.runActions[0].id).toBe("run.dev")
      expect(native.sessions).toEqual([])
      expect(native.preparationEvidence).toBeNull()
    } finally { await context.cleanup() }
  })

  it("approves only the current revision", async () => {
    const context = await setup()
    try {
      const project = await context.service.registerCandidate("candidate_1")
      await expect(context.service.approve(project.id, "stale")).rejects.toThrow("Recipe revision is stale")
      expect(await context.service.approve(project.id, project.recipeRevision)).toMatchObject({ trust: "reviewed", state: "ready" })
    } finally { await context.cleanup() }
  })

  it("invalidates approval when relevant manifest evidence changes", async () => {
    const context = await setup()
    try {
      const project = await context.service.registerCandidate("candidate_1")
      await context.service.approve(project.id, project.recipeRevision)
      context.changeEvidence([{ relativePath: "package.json", content: '{"scripts":{"dev":"next dev -p 4200"}}', size: 42 }, { relativePath: "package-lock.json", content: "{}", size: 2 }])
      const inspected = await context.service.inspect(project.id)
      expect(inspected).toMatchObject({ trust: "unreviewed", state: "needs_review" })
      expect(inspected.recipeRevision).not.toBe(project.recipeRevision)
    } finally { await context.cleanup() }
  })

  it("denies native root registration in web mode", async () => {
    const context = await setup()
    try {
      const service = new ProjectHostService({ roots: {} as ProjectRootStorePort, reader: { readEvidence: async () => [] }, store: context.store, id: () => "p", now: () => "now", desktop: false })
      await expect(service.registerCandidate("candidate_1")).rejects.toThrow("Local project registration requires the desktop")
    } finally { await context.cleanup() }
  })

  it("removes registration without asking the root adapter to delete files", async () => {
    const context = await setup()
    try {
      const project = await context.service.registerCandidate("candidate_1")
      await context.service.remove(project.id)
      expect(await context.service.list()).toEqual([])
    } finally { await context.cleanup() }
  })
})
