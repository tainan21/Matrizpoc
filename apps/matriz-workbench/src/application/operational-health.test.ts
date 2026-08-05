import { describe, expect, it, vi } from "vitest"
import { buildOperationalHealth } from "./operational-health"

vi.mock("../integration/collaboration/notification-outbox-store", () => ({
  NotificationOutboxStore: class {
    async getConfig(projectId: string) {
      if (projectId === "broken") throw new Error("config invalid")
      return {
        enabled: projectId === "sample",
        channels: projectId === "sample" ? ["slack"] : [],
      }
    }
    async list(projectId: string) {
      return projectId === "sample"
        ? [{ status: "queued" }, { status: "failed" }, { status: "delivered" }]
        : []
    }
  },
}))

describe("buildOperationalHealth", () => {
  it("reports provider state without claiming disconnected delivery", async () => {
    const repository = {
      repositoryRoot: "C:/repo",
      discoverProjects: vi.fn().mockResolvedValue([
        { id: "sample", initialized: true, corrupted: false },
        { id: "broken", initialized: true, corrupted: true },
        { id: "plain", initialized: false, corrupted: false },
      ]),
    }
    const manager = {
      runtimeInfo: vi.fn().mockResolvedValue({
        available: true,
        source: "desktop",
        activeRuns: 1,
        maxConcurrentRuns: 2,
      }),
    }

    const health = await buildOperationalHealth(repository as never, manager as never)

    expect(health.projects).toMatchObject({ detected: 3, initialized: 2, corrupted: 1 })
    expect(health.projects.discoveryDurationMs).toBeGreaterThanOrEqual(0)
    expect(health.build.available).toBe(false)
    expect(health.notifications).toMatchObject({
      configuredProjects: 1,
      queued: 1,
      failed: 1,
      delivered: 1,
      adaptersConnected: false,
    })
    expect(health.notifications.projects.find((project) => project.projectId === "broken"))
      .toMatchObject({ status: "invalid", detail: "config invalid" })
    expect(health.codex).toMatchObject({ available: true, activeRuns: 1, maxConcurrentRuns: 2 })
  })
})
