import { describe, expect, it } from "vitest"
import { DoctorService } from "./doctor-service"

describe("DoctorService cleanup", () => {
  it("requires a fresh preview and refuses active projects", async () => {
    const removed: string[] = []
    const service = new DoctorService({
      rootDir: "C:/repo",
      listProjects: async () => [{ id: "demo", name: "demo", path: "C:/repo/apps/demo", port: 3000, actions: [] }],
      listSessions: () => [],
      inspect: async () => ({ generatedAt: "now", drive: { totalBytes: 100, freeBytes: 50, status: "healthy" }, projects: [{ id: "demo", name: "demo", route: "mih/apps/demo", totalBytes: 10, cacheBytes: 5, memoryBytes: null, branch: "main", dirty: false, status: "healthy", cacheTargets: [{ id: "next", bytes: 5, reclaimable: true }] }] }),
      remove: async (path) => { removed.push(path) },
      now: () => 1000,
    })
    const preview = await service.previewCleanup("demo", "next")
    expect(preview).toMatchObject({ projectId: "demo", targetId: "next", bytes: 5 })
    await service.confirmCleanup(preview.token)
    expect(removed).toEqual(["C:\\repo\\apps\\demo\\.next"])
    await expect(service.confirmCleanup(preview.token)).rejects.toThrow("Unknown cleanup preview")
  })

  it("rejects cleanup while the project runs", async () => {
    const service = new DoctorService({ rootDir: "C:/repo", listProjects: async () => [{ id: "demo", name: "demo", path: "C:/repo/apps/demo", port: null, actions: [] }], listSessions: () => [{ projectId: "demo", status: "running" }], inspect: async () => ({ generatedAt: "now", drive: { totalBytes: null, freeBytes: null, status: "unknown" }, projects: [] }), remove: async () => {}, now: () => 1 })
    await expect(service.previewCleanup("demo", "next")).rejects.toThrow("active session")
  })
})
