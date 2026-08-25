import { describe, expect, it } from "vitest"
import { collectSystemSnapshot } from "./collect-system-snapshot"

describe("collectSystemSnapshot", () => {
  it("merges lightweight and detailed readings using the injected clock", async () => {
    let detailSampledAt: number | undefined

    const snapshot = await collectSystemSnapshot({
      system: {
        sample: () => ({
          platform: "win32",
          uptimeSeconds: 120,
          cpuTicks: { idle: 20, total: 80 },
          totalMemoryBytes: 1_000,
          freeMemoryBytes: 250,
        }),
      },
      details: {
        sample: async (nowMs) => {
          detailSampledAt = nowMs
          return {
            processes: [{ pid: 8, name: "System", cpuSeconds: 4, memoryBytes: 500 }],
            temperatureCelsius: 42.4,
          }
        },
      },
      now: () => new Date("2026-08-25T12:34:56.000Z"),
    })

    expect(detailSampledAt).toBe(Date.parse("2026-08-25T12:34:56.000Z"))
    expect(snapshot).toEqual({
      sampledAt: "2026-08-25T12:34:56.000Z",
      platform: "win32",
      uptimeSeconds: 120,
      cpuPercent: 75,
      memory: { totalBytes: 1_000, usedBytes: 750, percent: 75 },
      temperature: { availability: "available", value: 42.4, unit: "celsius" },
      processes: [{ pid: 8, name: "System", cpuSeconds: 4, memoryBytes: 500 }],
    })
  })
})
