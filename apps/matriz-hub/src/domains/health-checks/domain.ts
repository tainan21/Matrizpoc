export type HealthCheckKind = "routes" | "apis"

export type HealthFailureCategory =
  | "endpoint_not_found"
  | "server_error"
  | "unauthorized"
  | "forbidden"
  | "method_not_allowed"
  | "unexpected_response"
  | "timeout"
  | "network_error"

export interface HealthCheckTarget {
  readonly appId: string
  readonly project: string
  readonly environment: string
  readonly route: string
  readonly url: string
  readonly method: "GET" | "OPTIONS"
  readonly probeMode: "content" | "reachability"
}

export interface HealthCheckItemResult extends HealthCheckTarget {
  readonly statusHttp: number | null
  readonly success: boolean
  readonly durationMs: number
  readonly category: HealthFailureCategory | null
  readonly error: string | null
}

export interface HealthCheckRunResult {
  readonly version: "myhub-health-check/v1"
  readonly id: string
  readonly kind: HealthCheckKind
  readonly environment: string
  readonly startedAt: string
  readonly finishedAt: string
  readonly durationMs: number
  readonly summary: {
    readonly total: number
    readonly tested: number
    readonly ok: number
    readonly failures: number
  }
  readonly results: readonly HealthCheckItemResult[]
  readonly persistenceWarning?: string
}

export function classifyHealthFailure(status: number): HealthFailureCategory | null {
  if (status >= 200 && status < 400) return null
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "endpoint_not_found"
  if (status === 405) return "method_not_allowed"
  if (status >= 500) return "server_error"
  return "unexpected_response"
}

interface RunHealthCheckOptions {
  readonly kind: HealthCheckKind
  readonly environment: string
  readonly targets: readonly HealthCheckTarget[]
  readonly fetcher?: typeof fetch
  readonly concurrency?: number
  readonly timeoutMs?: number
}

async function checkTarget(
  target: HealthCheckTarget,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<HealthCheckItemResult> {
  const startedAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetcher(target.url, {
      method: target.method,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "MyHub-Health-Check/1.0" },
    })
    const category = classifyHealthFailure(response.status)
    return {
      ...target,
      statusHttp: response.status,
      success: category === null,
      durationMs: Date.now() - startedAt,
      category,
      error: category ? `HTTP ${response.status} ${response.statusText}`.trim() : null,
    }
  } catch (error) {
    const timedOut = controller.signal.aborted ||
      (error instanceof DOMException && error.name === "AbortError")
    return {
      ...target,
      statusHttp: null,
      success: false,
      durationMs: Date.now() - startedAt,
      category: timedOut ? "timeout" : "network_error",
      error: timedOut
        ? `Timeout após ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "Erro de rede desconhecido",
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function runHealthCheck(
  options: RunHealthCheckOptions,
): Promise<HealthCheckRunResult> {
  const startedAtMs = Date.now()
  const startedAt = new Date(startedAtMs).toISOString()
  const fetcher = options.fetcher ?? fetch
  const timeoutMs = Math.max(1, options.timeoutMs ?? 8_000)
  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 8))
  const results = new Array<HealthCheckItemResult>(options.targets.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < options.targets.length) {
      const index = nextIndex
      nextIndex += 1
      const target = options.targets[index]
      if (target) results[index] = await checkTarget(target, fetcher, timeoutMs)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, options.targets.length)) }, worker),
  )

  const finishedAtMs = Date.now()
  const failures = results.filter((result) => !result.success).length
  return {
    version: "myhub-health-check/v1",
    id: crypto.randomUUID(),
    kind: options.kind,
    environment: options.environment,
    startedAt,
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - startedAtMs,
    summary: {
      total: options.targets.length,
      tested: results.length,
      ok: results.length - failures,
      failures,
    },
    results,
  }
}
