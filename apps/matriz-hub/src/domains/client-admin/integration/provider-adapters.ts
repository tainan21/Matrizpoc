export type ProviderRefreshResult = Readonly<{
  state: "fresh" | "not_configured" | "unavailable" | "error"
  capturedAt: string | null
  payload: unknown
  errorCode: string | null
}>

type Environment = Readonly<Record<string, string | undefined>>
type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

async function requestWithRetry(fetcher: Fetcher, input: string, init: RequestInit): Promise<Response> {
  let last: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetcher(input, { ...init, signal: AbortSignal.timeout(4_000), cache: "no-store" })
      if (response.ok || response.status < 500) return response
      last = new Error("provider unavailable")
    } catch (error) { last = error }
  }
  throw last instanceof Error ? last : new Error("provider unavailable")
}

const unavailable = (code: string): ProviderRefreshResult => ({ state: "unavailable", capturedAt: null, payload: null, errorCode: code })
const notConfigured = (): ProviderRefreshResult => ({ state: "not_configured", capturedAt: null, payload: null, errorCode: null })

export function createVercelAdapter(environment: Environment, fetcher: Fetcher = fetch) {
  return {
    async refresh(): Promise<ProviderRefreshResult> {
      const token = environment.CLIENT_ADMIN_VERCEL_TOKEN?.trim()
      const projects = environment.CLIENT_ADMIN_VERCEL_PROJECT_IDS?.split(",").map((value) => value.trim()).filter(Boolean) ?? []
      if (!token || projects.length === 0) return notConfigured()
      try {
        const deployments = await Promise.all(projects.map(async (projectId) => {
          const url = new URL("https://api.vercel.com/v6/deployments")
          url.searchParams.set("projectId", projectId)
          url.searchParams.set("limit", "1")
          if (environment.CLIENT_ADMIN_VERCEL_TEAM_ID) url.searchParams.set("teamId", environment.CLIENT_ADMIN_VERCEL_TEAM_ID)
          const response = await requestWithRetry(fetcher, url.toString(), { headers: { authorization: `Bearer ${token}`, accept: "application/json" } })
          if (!response.ok) throw new Error("provider rejected request")
          const json = await response.json() as { deployments?: readonly { uid?: string; name?: string; state?: string; created?: number }[] }
          return { projectId, latest: json.deployments?.[0] ?? null }
        }))
        return { state: "fresh", capturedAt: new Date().toISOString(), payload: { deployments }, errorCode: null }
      } catch { return unavailable("VERCEL_UNAVAILABLE") }
    },
  }
}

export function createGa4Adapter(environment: Environment, fetcher: Fetcher = fetch) {
  return {
    async refresh(): Promise<ProviderRefreshResult> {
      const propertyId = environment.CLIENT_ADMIN_GA4_PROPERTY_ID?.trim()
      const accessToken = environment.CLIENT_ADMIN_GA4_ACCESS_TOKEN?.trim()
      if (!propertyId || !accessToken) return notConfigured()
      try {
        const response = await requestWithRetry(fetcher, `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`, {
          method: "POST",
          headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
          body: JSON.stringify({ dateRanges: [{ startDate: "7daysAgo", endDate: "today" }], metrics: [{ name: "sessions" }] }),
        })
        if (!response.ok) throw new Error("provider rejected request")
        const json = await response.json() as { rows?: readonly { metricValues?: readonly { value?: string }[] }[] }
        const value = Number(json.rows?.[0]?.metricValues?.[0]?.value ?? 0)
        if (!Number.isFinite(value)) return { state: "error", capturedAt: null, payload: null, errorCode: "GA4_INVALID_RESPONSE" }
        return { state: "fresh", capturedAt: new Date().toISOString(), payload: { sessions: value }, errorCode: null }
      } catch { return unavailable("GA4_UNAVAILABLE") }
    },
  }
}
