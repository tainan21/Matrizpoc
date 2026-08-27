import {
  cpuUsagePercent,
  memoryUsagePercent,
  sensorReading,
  type CpuTicks,
  type ProcessReading,
  type SystemSnapshot,
} from "../domain/system-health"

export interface LightweightSample {
  readonly platform: string
  readonly uptimeSeconds: number
  readonly cpuTicks: CpuTicks
  readonly totalMemoryBytes: number
  readonly freeMemoryBytes: number
}

export interface SystemSampler {
  sample(): LightweightSample
}

export interface DetailSample {
  readonly processes: readonly ProcessReading[]
  readonly temperatureCelsius: number | null
}

export interface DetailSampler {
  sample(nowMs: number): Promise<DetailSample>
}

export async function collectSystemSnapshot(deps: {
  system: SystemSampler
  details: DetailSampler
  now: () => Date
}): Promise<SystemSnapshot> {
  const sampledAt = deps.now()
  const lightweight = deps.system.sample()
  const details = await deps.details.sample(sampledAt.getTime())
  const usedBytes = Math.max(0, lightweight.totalMemoryBytes - lightweight.freeMemoryBytes)

  return {
    sampledAt: sampledAt.toISOString(),
    platform: lightweight.platform,
    uptimeSeconds: lightweight.uptimeSeconds,
    cpuPercent: cpuUsagePercent({ idle: 0, total: 0 }, lightweight.cpuTicks),
    memory: {
      totalBytes: lightweight.totalMemoryBytes,
      usedBytes,
      percent: memoryUsagePercent(usedBytes, lightweight.totalMemoryBytes),
    },
    temperature: sensorReading(details.temperatureCelsius, "celsius"),
    processes: details.processes,
  }
}
