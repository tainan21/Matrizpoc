import { describe, expect, it } from "vitest"
import { NodeSystemSampler, type NodeOs } from "./node-system-sampler"

describe("NodeSystemSampler", () => {
  it("returns CPU tick deltas from successive lightweight samples", () => {
    const readings = [
      [{ times: { user: 10, nice: 0, sys: 0, idle: 10, irq: 0 } }],
      [{ times: { user: 20, nice: 0, sys: 0, idle: 20, irq: 0 } }],
    ]
    let reading = 0
    const system: NodeOs = {
      cpus: () => readings[reading++] ?? [],
      platform: () => "win32",
      uptime: () => 30,
      totalmem: () => 1_000,
      freemem: () => 400,
    }
    const sampler = new NodeSystemSampler(system)

    expect(sampler.sample().cpuTicks).toEqual({ idle: 0, total: 0 })
    expect(sampler.sample()).toMatchObject({
      platform: "win32",
      uptimeSeconds: 30,
      cpuTicks: { idle: 10, total: 20 },
      totalMemoryBytes: 1_000,
      freeMemoryBytes: 400,
    })
  })
})
