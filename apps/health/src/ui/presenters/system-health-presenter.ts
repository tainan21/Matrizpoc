import type { ProcessReading, SystemSnapshot } from "../../domain/system-health"

export type MetricTone = "healthy" | "attention" | "critical" | "unavailable"

export interface MetricVM {
  readonly label: string
  readonly value: string
  readonly detail: string
  readonly percent: number | null
  readonly tone: MetricTone
}

export interface ProcessVM {
  readonly pid: string
  readonly name: string
  readonly cpu: string
  readonly memory: string
}

export interface SystemHealthVM {
  readonly sampledAt: string
  readonly cpu: MetricVM
  readonly memory: MetricVM
  readonly temperature: MetricVM
  readonly uptime: MetricVM
  readonly processes: readonly ProcessVM[]
}

interface SnapshotResponse {
  readonly ok: boolean
  json(): Promise<unknown>
}

export type SystemHealthFetcher = () => Promise<SnapshotResponse>

const number = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const timestamp = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})
const GIBIBYTE = 1024 ** 3

export function toSystemHealthVM(snapshot: SystemSnapshot): SystemHealthVM {
  return {
    sampledAt: formatTimestamp(snapshot.sampledAt),
    cpu: metric("CPU", `${number.format(snapshot.cpuPercent)}%`, "Uso atual do processador", snapshot.cpuPercent),
    memory: metric(
      "Memória",
      `${formatBytes(snapshot.memory.usedBytes)} / ${formatBytes(snapshot.memory.totalBytes)}`,
      `${number.format(snapshot.memory.percent)}% em uso`,
      snapshot.memory.percent,
    ),
    temperature: snapshot.temperature.availability === "available" && snapshot.temperature.value !== null
      ? metric("Temperatura", `${number.format(snapshot.temperature.value)} °C`, "Sensor do sistema", null)
      : {
          label: "Temperatura",
          value: "Não disponível neste hardware",
          detail: "Sensor não exposto pelo sistema",
          percent: null,
          tone: "unavailable",
        },
    uptime: {
      label: "Atividade",
      value: formatUptime(snapshot.uptimeSeconds),
      detail: "Tempo desde a última inicialização",
      percent: null,
      tone: "healthy",
    },
    processes: snapshot.processes.map(toProcessVM),
  }
}

export async function readSystemHealthVM(fetchSnapshot: SystemHealthFetcher = fetchSystemSnapshot): Promise<SystemHealthVM> {
  const response = await fetchSnapshot()
  if (!response.ok) throw new Error("snapshot_unavailable")
  return toSystemHealthVM(await response.json() as SystemSnapshot)
}

function fetchSystemSnapshot(): Promise<SnapshotResponse> {
  return fetch("/api/system/snapshot", { cache: "no-store" })
}

function metric(label: string, value: string, detail: string, percent: number | null): MetricVM {
  return { label, value, detail, percent, tone: percent === null ? "healthy" : toneFor(percent) }
}

function toneFor(percent: number): MetricTone {
  if (percent < 70) return "healthy"
  if (percent < 85) return "attention"
  return "critical"
}

function toProcessVM(process: ProcessReading): ProcessVM {
  return {
    pid: String(process.pid),
    name: process.name,
    cpu: `${number.format(process.cpuSeconds)} s`,
    memory: formatBytes(process.memoryBytes),
  }
}

function formatBytes(bytes: number): string {
  return `${number.format(bytes / GIBIBYTE)} GB`
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : timestamp.format(date)
}

function formatUptime(seconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(seconds / 60))
  const days = Math.floor(totalMinutes / 1_440)
  const hours = Math.floor(totalMinutes % 1_440 / 60)
  const minutes = totalMinutes % 60
  const parts = days > 0 ? [`${days}d`] : []
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  parts.push(`${minutes}min`)
  return parts.join(" ")
}
