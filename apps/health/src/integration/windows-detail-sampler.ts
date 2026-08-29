import { execFile } from "node:child_process"
import type { DetailSample, DetailSampler } from "../application/collect-system-snapshot"
import type { ProcessReading } from "../domain/system-health"

export const POWERSHELL_EXECUTABLE = "powershell.exe"
export const PROCESS_SCRIPT = "Get-CimInstance Win32_Process | Sort-Object WorkingSetSize -Descending | Select-Object -First 12 -Property ProcessId,Name,KernelModeTime,UserModeTime,WorkingSetSize | ConvertTo-Json -Compress"
export const TEMPERATURE_SCRIPT = "Get-CimInstance -Namespace root/wmi MSAcpi_ThermalZone -ErrorAction SilentlyContinue | Select-Object CurrentTemperature | ConvertTo-Json -Compress"
export const STORAGE_SCRIPT = "Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='C:'\" | Select-Object Size,FreeSpace | ConvertTo-Json -Compress"

const EXEC_OPTIONS = { windowsHide: true, timeout: 2_000, maxBuffer: 64 * 1_024 } as const
const PROCESS_CACHE_MS = 5_000
const TEMPERATURE_CACHE_MS = 30_000
const PROCESS_LIMIT = 12

export interface PowerShellExecOptions {
  readonly windowsHide: boolean
  readonly timeout: number
  readonly maxBuffer: number
}

export type PowerShellExec = (
  file: string,
  args: readonly string[],
  options: PowerShellExecOptions,
) => Promise<string>

export class WindowsDetailSampler implements DetailSampler {
  private processes: readonly ProcessReading[] | undefined
  private processesSampledAt = Number.NEGATIVE_INFINITY
  private temperatureCelsius: number | null | undefined
  private temperatureSampledAt = Number.NEGATIVE_INFINITY
  private storage: { totalBytes: number | null; freeBytes: number | null } | undefined
  private storageSampledAt = Number.NEGATIVE_INFINITY

  constructor(private readonly exec: PowerShellExec = executePowerShell) {}

  async sample(nowMs: number): Promise<DetailSample> {
    const [processes, temperatureCelsius, storage] = await Promise.all([
      this.processesAt(nowMs),
      this.temperatureAt(nowMs),
      this.storageAt(nowMs),
    ])

    return { processes, temperatureCelsius, storage }
  }

  private async processesAt(nowMs: number): Promise<readonly ProcessReading[]> {
    if (this.processes !== undefined && nowMs - this.processesSampledAt < PROCESS_CACHE_MS) {
      return this.processes
    }

    this.processes = await this.readProcesses()
    this.processesSampledAt = nowMs
    return this.processes
  }

  private async temperatureAt(nowMs: number): Promise<number | null> {
    if (this.temperatureCelsius !== undefined && nowMs - this.temperatureSampledAt < TEMPERATURE_CACHE_MS) {
      return this.temperatureCelsius
    }

    this.temperatureCelsius = await this.readTemperature()
    this.temperatureSampledAt = nowMs
    return this.temperatureCelsius
  }

  private async readProcesses(): Promise<readonly ProcessReading[]> {
    try {
      const result = parseJson(await this.exec(POWERSHELL_EXECUTABLE, powerShellArgs(PROCESS_SCRIPT), EXEC_OPTIONS))
      return records(result)
        .map(toProcessReading)
        .filter((reading): reading is ProcessReading => reading !== null)
        .sort((left, right) => right.memoryBytes - left.memoryBytes)
        .slice(0, PROCESS_LIMIT)
    } catch {
      return []
    }
  }

  private async readTemperature(): Promise<number | null> {
    try {
      const result = parseJson(await this.exec(POWERSHELL_EXECUTABLE, powerShellArgs(TEMPERATURE_SCRIPT), EXEC_OPTIONS))
      const value = records(result).at(0)?.CurrentTemperature
      const kelvinTenths = numberValue(value)
      return kelvinTenths === null ? null : roundToOneDecimal(kelvinTenths / 10 - 273.15)
    } catch {
      return null
    }
  }

  private async storageAt(nowMs: number) {
    if (this.storage !== undefined && nowMs - this.storageSampledAt < PROCESS_CACHE_MS) return this.storage
    this.storage = await this.readStorage()
    this.storageSampledAt = nowMs
    return this.storage
  }

  private async readStorage() {
    try {
      const value = records(parseJson(await this.exec(POWERSHELL_EXECUTABLE, powerShellArgs(STORAGE_SCRIPT), EXEC_OPTIONS))).at(0)
      return { totalBytes: numberValue(value?.Size) ?? null, freeBytes: numberValue(value?.FreeSpace) ?? null }
    } catch { return { totalBytes: null, freeBytes: null } }
  }
}

function powerShellArgs(script: string): readonly string[] {
  return ["-NoProfile", "-NonInteractive", "-Command", script]
}

function executePowerShell(file: string, args: readonly string[], options: PowerShellExecOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, [...args], options, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      resolve(stdout)
    })
  })
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown
}

function records(value: unknown): readonly Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord)
  }
  return isRecord(value) ? [value] : []
}

function toProcessReading(value: Record<string, unknown>): ProcessReading | null {
  const pid = numberValue(value.ProcessId)
  const kernelTime = numberValue(value.KernelModeTime)
  const userTime = numberValue(value.UserModeTime)
  const memoryBytes = numberValue(value.WorkingSetSize)
  const name = processName(value.Name)

  if (pid === null || pid < 0 || kernelTime === null || userTime === null || memoryBytes === null || memoryBytes < 0 || name === null) {
    return null
  }

  return {
    pid: Math.trunc(pid),
    name,
    cpuSeconds: roundToOneDecimal((kernelTime + userTime) / 10_000_000),
    memoryBytes: Math.trunc(memoryBytes),
  }
}

function processName(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null
  }
  return value.split(/[\\/]/).at(-1) ?? null
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
