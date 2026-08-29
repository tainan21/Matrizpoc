export interface CpuTicks {
  readonly idle: number
  readonly total: number
}

export interface SensorReading {
  readonly availability: "available" | "unavailable"
  readonly value: number | null
  readonly unit: "celsius"
}

export interface ProcessReading {
  readonly pid: number
  readonly name: string
  readonly cpuSeconds: number
  readonly memoryBytes: number
}

export interface SystemSnapshot {
  readonly sampledAt: string
  readonly platform: string
  readonly uptimeSeconds: number
  readonly cpuPercent: number
  readonly memory: {
    readonly totalBytes: number
    readonly usedBytes: number
    readonly percent: number
  }
  readonly temperature: SensorReading
  readonly storage: { readonly totalBytes: number | null; readonly freeBytes: number | null; readonly percent: number | null }
  readonly processes: readonly ProcessReading[]
}

export function memoryUsagePercent(used: number, total: number): number {
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) {
    return 0
  }

  return percent(used / total * 100)
}

export function cpuUsagePercent(previous: CpuTicks, current: CpuTicks): number {
  const totalDelta = current.total - previous.total
  const idleDelta = current.idle - previous.idle

  if (!Number.isFinite(totalDelta) || !Number.isFinite(idleDelta) || totalDelta <= 0) {
    return 0
  }

  return percent((1 - idleDelta / totalDelta) * 100)
}

export function sensorReading(value: number | null, unit: "celsius"): SensorReading {
  if (value === null || !Number.isFinite(value)) {
    return { availability: "unavailable", value: null, unit }
  }

  return { availability: "available", value, unit }
}

function percent(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10
}
