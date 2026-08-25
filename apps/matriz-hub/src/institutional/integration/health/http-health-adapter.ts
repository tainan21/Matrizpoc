import type {
  ProjectEnvironment,
  ProjectEnvironmentKind,
} from "@matriz/integration-api-contracts/v1/institutional"

export interface CheckHttpEnvironmentInput {
  id: string
  kind: ProjectEnvironmentKind
  label: string
  url: string
  now?: Date
  timeoutMs?: number
  allowedHosts?: readonly string[]
  fetch?: typeof fetch
}

function validateTarget(value: string, allowedHosts: readonly string[]): URL {
  const url = new URL(value)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS health targets are allowed.")
  }
  if (url.username || url.password) throw new Error("Health targets cannot contain credentials.")
  const defaultHosts = ["127.0.0.1", "localhost", "::1"]
  if (![...defaultHosts, ...allowedHosts].includes(url.hostname)) {
    throw new Error("Health target is not in the configured host allowlist.")
  }
  return url
}

export async function checkHttpEnvironment(
  input: CheckHttpEnvironmentInput,
): Promise<ProjectEnvironment> {
  const collectedAt = (input.now ?? new Date()).toISOString()
  const sourceId = `http:${input.id}`
  const base = {
    id: input.id,
    kind: input.kind,
    label: input.label,
    url: input.url,
  }

  try {
    const target = validateTarget(input.url, input.allowedHosts ?? [])
    const response = await (input.fetch ?? fetch)(target, {
      method: "HEAD",
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(input.timeoutMs ?? 3_000),
    })
    return {
      ...base,
      status: response.ok ? "available" : response.status >= 500 ? "degraded" : "offline",
      observation: {
        sourceId,
        nature: "observed",
        observedAt: collectedAt,
        collectedAt,
        freshness: "fresh",
        confidence: "verified",
      },
    }
  } catch (error) {
    return {
      ...base,
      status: "unknown",
      observation: {
        sourceId,
        nature: "observed",
        observedAt: collectedAt,
        collectedAt,
        freshness: "unknown",
        confidence: "verified",
        lastError: {
          code: "http_check_failed",
          message: error instanceof Error ? error.message : String(error),
          occurredAt: collectedAt,
        },
      },
    }
  }
}
