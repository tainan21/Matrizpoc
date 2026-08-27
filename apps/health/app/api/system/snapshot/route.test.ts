import { describe, expect, it } from "vitest"
import { createSystemSnapshotGet } from "./route"

describe("system snapshot route", () => {
  it("returns the snapshot when detailed readings are degraded", async () => {
    const GET = createSystemSnapshotGet({
      system: {
        sample: () => ({
          platform: "win32",
          uptimeSeconds: 10,
          cpuTicks: { idle: 10, total: 20 },
          totalMemoryBytes: 100,
          freeMemoryBytes: 20,
        }),
      },
      details: { sample: async () => ({ processes: [], temperatureCelsius: null }) },
      now: () => new Date("2026-08-25T12:00:00.000Z"),
    })

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      processes: [],
      temperature: { availability: "unavailable", value: null },
    })
  })

  it("returns a sanitized unavailable response for unexpected failures", async () => {
    const GET = createSystemSnapshotGet({
      system: { sample: () => { throw new Error("unexpected") } },
      details: { sample: async () => ({ processes: [], temperatureCelsius: null }) },
      now: () => new Date("2026-08-25T12:00:00.000Z"),
    })

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: "snapshot_unavailable" })
  })
})
