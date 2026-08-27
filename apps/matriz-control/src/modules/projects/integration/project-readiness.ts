import type { ReadinessProbe } from "../domain/recipe"

type FetchResponse = { ok: boolean }
type Options = { fetch(url: string): Promise<FetchResponse>; delay(ms: number): Promise<void>; now(): number }
export type ReadinessResult = { state: "ready"; url?: string } | { state: "degraded" | "failed"; reason: string }

function healthPath(path: string | null): string {
  const value = path ?? "/"
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) throw new Error("Invalid readiness path")
  return value
}

export class ProjectReadinessProbe {
  constructor(private readonly options: Options) {}
  async wait(probe: ReadinessProbe, port: number, isAlive: () => boolean): Promise<ReadinessResult> {
    if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("Invalid readiness port")
    if (probe.kind !== "http") throw new Error("Unsupported readiness probe")
    const url = `http://127.0.0.1:${port}${healthPath(probe.path)}`
    const startedAt = this.options.now()
    while (this.options.now() - startedAt <= probe.timeoutMs) {
      if (!isAlive()) return { state: "failed", reason: "process-exited" }
      try { if ((await this.options.fetch(url)).ok) return { state: "ready", url } } catch { /* retry until timeout */ }
      await this.options.delay(100)
    }
    return { state: "degraded", reason: "readiness-timeout" }
  }
}

export async function assertExpectedPortsAvailable(ports: readonly number[], available: (port: number) => Promise<boolean>): Promise<void> {
  for (const port of ports) if (!await available(port)) throw new Error(`Expected port ${port} is already occupied by an external process`)
}
