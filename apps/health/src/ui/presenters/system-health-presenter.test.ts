import { describe, expect, it } from "vitest"
import type { SystemSnapshot } from "../../domain/system-health"
import { readSystemHealthVM, toSystemHealthVM } from "./system-health-presenter"

const sample: SystemSnapshot = {
  sampledAt: "2026-08-25T12:03:04.000Z",
  platform: "win32",
  uptimeSeconds: 93_780,
  cpuPercent: 68.4,
  memory: {
    totalBytes: 16 * 1024 ** 3,
    usedBytes: 12 * 1024 ** 3,
    percent: 75,
  },
  temperature: { availability: "unavailable", value: null, unit: "celsius" },
  processes: [{ pid: 4242, name: "Matriz Control", cpuSeconds: 12.3, memoryBytes: 1.5 * 1024 ** 3 }],
}

describe("system health presenter", () => {
  it("converts the snapshot response into a dashboard view model at the fetch boundary", async () => {
    const fetchSnapshot = async () => ({ ok: true, json: async () => sample })

    await expect(readSystemHealthVM(fetchSnapshot)).resolves.toMatchObject({
      cpu: { value: "68,4%" },
      memory: { value: "12,0 GB / 16,0 GB" },
    })
  })

  it("formats raw bytes and unavailable sensors for the dashboard", () => {
    const vm = toSystemHealthVM(sample)

    expect(vm.memory.value).toBe("12,0 GB / 16,0 GB")
    expect(vm.temperature.value).toBe("Não disponível neste hardware")
    expect(vm.processes[0]).toMatchObject({ cpu: "12,3 s acumulados", memory: "1,5 GB", pid: "4242" })
  })

  it.each([
    [69.9, "healthy"],
    [70, "attention"],
    [84.9, "attention"],
    [85, "critical"],
  ] as const)("assigns %s%% CPU and memory to %s", (percent, tone) => {
    const vm = toSystemHealthVM({
      ...sample,
      cpuPercent: percent,
      memory: { ...sample.memory, percent },
    })

    expect(vm.cpu.tone).toBe(tone)
    expect(vm.memory.tone).toBe(tone)
  })
})
