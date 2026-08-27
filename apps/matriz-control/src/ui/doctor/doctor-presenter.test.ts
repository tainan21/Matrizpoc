import { describe, expect, it } from "vitest"
import { formatBytes, toDoctorViewModel } from "./doctor-presenter"

describe("doctor presenter", () => {
  it("formats resources and never exposes physical paths", () => {
    expect(formatBytes(1_500_000_000)).toBe("1.50 GB")
    expect(formatBytes(null)).toBe("indisponível")
    const view = toDoctorViewModel({ generatedAt: "2026-08-25T00:00:00.000Z", drive: { totalBytes: 10, freeBytes: 2, status: "healthy" }, projects: [{ id: "matriz-control", name: "matriz-control", route: "mih/apps/matriz-control", totalBytes: 1000, cacheBytes: 0, memoryBytes: null, branch: "main", dirty: true, status: "unknown", cacheTargets: [] }] })
    expect(JSON.stringify(view)).not.toContain("C:\\")
    expect(view.projects[0]?.memory).toBe("indisponível")
    expect(view.projects[0]?.dirty).toBe(true)
  })
})
