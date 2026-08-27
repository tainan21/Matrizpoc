import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createProjectRegistration } from "../domain/project"
import { computeRecipeRevision, type ProjectRecipeMaterial } from "../domain/recipe"
import { AtomicProjectStore, type NativeProjectRecord } from "./atomic-project-store"

const dirs: string[] = []
async function temporary() { const path = await mkdtemp(join(tmpdir(), "matriz-project-store-")); dirs.push(path); return path }
afterEach(async () => { for (const path of dirs.splice(0)) await rm(path, { recursive: true, force: true }) })

const material: ProjectRecipeMaterial = { detectors: [{ detector: "node", kind: "manifest", value: "package.json" }], prepareActions: [], runActions: [], surfaces: [], permissions: ["project.inspect"] }
function record(overrides: Partial<NativeProjectRecord> = {}): NativeProjectRecord {
  const revision = computeRecipeRevision(material)
  return {
    registration: createProjectRegistration({ id: "project_1", displayName: "Demo", canonicalRootRef: "root_1", source: "local", recipeRevision: revision, now: "2026-08-27T12:00:00.000Z" }),
    canonicalPath: "C:\\Projects\\Demo",
    recipe: { ...material, revision },
    sessions: [],
    preparationEvidence: null,
    surfacePreference: null,
    reconciliation: null,
    ...overrides,
  }
}

describe("AtomicProjectStore", () => {
  it("survives a new store instance and leaves no temp file", async () => {
    const dir = await temporary()
    const path = join(dir, "projects.json")
    await new AtomicProjectStore(path).save(record())
    const reloaded = await new AtomicProjectStore(path).listNative()
    expect(reloaded).toHaveLength(1)
    expect(reloaded[0].canonicalPath).toBe("C:\\Projects\\Demo")
    await expect(readFile(`${path}.tmp`, "utf8")).rejects.toThrow()
  })

  it("deduplicates canonical roots case-insensitively", async () => {
    const store = new AtomicProjectStore(join(await temporary(), "projects.json"))
    await store.save(record())
    await expect(store.save(record({ registration: { ...record().registration, id: "project_2", canonicalRootRef: "root_2" }, canonicalPath: "c:\\projects\\demo\\" }))).rejects.toThrow("Project root is already registered")
  })

  it("fails closed on corrupt persistence instead of fabricating an empty catalog", async () => {
    const path = join(await temporary(), "projects.json")
    await writeFile(path, "not-json")
    await expect(new AtomicProjectStore(path).listNative()).rejects.toThrow("Project catalog is corrupt")
  })

  it("limits persisted session history to fifty sanitized records", async () => {
    const store = new AtomicProjectStore(join(await temporary(), "projects.json"))
    const sessions = Array.from({ length: 60 }, (_, index) => ({ sessionId: `s${index}`, projectId: "project_1", actionId: "run.dev", recipeRevision: "r", pid: null, expectedPorts: [], state: "stopped" as const, startedAt: String(index).padStart(2, "0"), endedAt: null, result: "ok" }))
    await store.save(record({ sessions }))
    const [saved] = await store.listNative()
    expect(saved.sessions).toHaveLength(50)
    expect(saved.sessions[0].sessionId).toBe("s10")
  })

  it("removes only catalog data", async () => {
    const dir = await temporary()
    const projectFile = join(dir, "owned-by-project.txt")
    await writeFile(projectFile, "keep")
    const store = new AtomicProjectStore(join(dir, "projects.json"))
    await store.save(record({ canonicalPath: dir }))
    await store.remove("project_1")
    expect(await readFile(projectFile, "utf8")).toBe("keep")
    expect(await store.listNative()).toEqual([])
  })
})
