import { describe, expect, it } from "vitest"
import {
  POWERSHELL_EXECUTABLE,
  PROCESS_SCRIPT,
  TEMPERATURE_SCRIPT,
  WindowsDetailSampler,
  type PowerShellExec,
} from "./windows-detail-sampler"

describe("WindowsDetailSampler", () => {
  it("uses fixed, bounded hidden PowerShell calls and caches independent readings", async () => {
    const calls: Parameters<PowerShellExec>[] = []
    const exec: PowerShellExec = async (...args) => {
      calls.push(args)
      return calls.length === 1
        ? JSON.stringify([{ ProcessId: 4, Name: "System", KernelModeTime: 10_000_000, UserModeTime: 20_000_000, WorkingSetSize: 4_096 }])
        : JSON.stringify([{ CurrentTemperature: 3_000 }])
    }
    const sampler = new WindowsDetailSampler(exec)

    const first = await sampler.sample(1_000)
    const cached = await sampler.sample(2_000)

    expect(first).toEqual({
      processes: [{ pid: 4, name: "System", cpuSeconds: 3, memoryBytes: 4_096 }],
      temperatureCelsius: 26.9,
    })
    expect(cached).toEqual(first)
    expect(calls).toHaveLength(2)
    expect(calls.map(([file]) => file)).toEqual([POWERSHELL_EXECUTABLE, POWERSHELL_EXECUTABLE])
    expect(calls.map(([, args]) => args)).toEqual([
      ["-NoProfile", "-NonInteractive", "-Command", PROCESS_SCRIPT],
      ["-NoProfile", "-NonInteractive", "-Command", TEMPERATURE_SCRIPT],
    ])
    for (const [, , options] of calls) {
      expect(options.windowsHide).toBe(true)
      expect(options.timeout).toBeLessThanOrEqual(2_000)
      expect(options.maxBuffer).toBeLessThanOrEqual(64 * 1_024)
    }
  })

  it("degrades invalid detail JSON without discarding the snapshot", async () => {
    const sampler = new WindowsDetailSampler(async () => "not json")

    await expect(sampler.sample(1_000)).resolves.toEqual({
      processes: [],
      temperatureCelsius: null,
    })
  })
})
