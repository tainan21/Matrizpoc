export interface AppHealthV1 {
  readonly status: "ok"
  readonly appId: string
  readonly contractVersion: "v1"
}

export interface HealthCheckOptions {
  readonly url: string
  readonly expectedAppId: string
  readonly timeoutMs: number
  readonly intervalMs: number
  readonly requestTimeoutMs?: number
  readonly fetchImpl?: typeof fetch
}

function isHealthPayload(value: unknown, expectedAppId: string): value is AppHealthV1 {
  if (!value || typeof value !== "object") return false
  const payload = value as Record<string, unknown>
  return payload.status === "ok"
    && payload.appId === expectedAppId
    && payload.contractVersion === "v1"
}

export async function waitForHealth(options: HealthCheckOptions): Promise<AppHealthV1> {
  const deadline = Date.now() + options.timeoutMs
  const request = options.fetchImpl ?? fetch
  let lastError = "endpoint unavailable"
  while (Date.now() < deadline) {
    try {
      const remaining = Math.max(1, deadline - Date.now())
      const response = await request(options.url, {
        signal: AbortSignal.timeout(Math.min(options.requestTimeoutMs ?? 1_000, remaining)),
      })
      const payload: unknown = await response.json()
      if (response.ok && isHealthPayload(payload, options.expectedAppId)) return payload
      lastError = `unexpected response ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, options.intervalMs))
  }
  throw new Error(`Health check timed out for ${options.expectedAppId}: ${lastError}`)
}
