import { describe, expect, it } from "vitest"
import {
  POWERSHELL_EXECUTABLE,
  PROCESS_SCRIPT,
  STORAGE_SCRIPT,
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
        : calls.length === 2 ? JSON.stringify([{ CurrentTemperature: 3_000 }]) : JSON.stringify({ Size: 2_000, FreeSpace: 500 })
    }
    const sampler = new WindowsDetailSampler(exec)

    const first = await sampler.sample(1_000)
    const cached = await sampler.sample(2_000)

    expect(first).toEqual({
      processes: [{ pid: 4, name: "System", cpuSeconds: 3, memoryBytes: 4_096 }],
      temperatureCelsius: 26.9,
      storage: { totalBytes: 2_000, freeBytes: 500 },
    })
    expect(cached).toEqual(first)
    expect(calls).toHaveLength(3)
    expect(calls.map(([file]) => file)).toEqual([POWERSHELL_EXECUTABLE, POWERSHELL_EXECUTABLE, POWERSHELL_EXECUTABLE])
    expect(calls.map(([, args]) => args)).toEqual([
      ["-NoProfile", "-NonInteractive", "-Command", PROCESS_SCRIPT],
      ["-NoProfile", "-NonInteractive", "-Command", TEMPERATURE_SCRIPT],
      ["-NoProfile", "-NonInteractive", "-Command", STORAGE_SCRIPT],
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
      storage: { totalBytes: null, freeBytes: null },
    })
  })

  it("asks PowerShell for only the highest-memory processes before JSON serialization", () => {
    expect(PROCESS_SCRIPT).toContain("Sort-Object WorkingSetSize -Descending")
    expect(PROCESS_SCRIPT).toContain("Select-Object -First 12")
    expect(PROCESS_SCRIPT.indexOf("Select-Object -First 12")).toBeLessThan(PROCESS_SCRIPT.indexOf("ConvertTo-Json"))
  })

  it("defensively orders adapter results by memory", async () => {
    const sampler = new WindowsDetailSampler(async (_file, args) => args.includes(PROCESS_SCRIPT)
      ? JSON.stringify([
          { ProcessId: 1, Name: "small.exe", KernelModeTime: 0, UserModeTime: 10_000_000, WorkingSetSize: 100 },
          { ProcessId: 2, Name: "large.exe", KernelModeTime: 0, UserModeTime: 20_000_000, WorkingSetSize: 900 },
        ])
      : "[]")

    const result = await sampler.sample(1_000)

    expect(result.processes.map((process) => process.name)).toEqual(["large.exe", "small.exe"])
  })
})
