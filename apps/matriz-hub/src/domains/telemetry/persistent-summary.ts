export interface PersistentTelemetryRow {
  readonly appId: string
  readonly eventName: string
  readonly occurredAt: Date
  readonly properties: unknown
}

export interface TelemetryAppSummary {
  readonly appId: string
  readonly activeUsers24h: number
  readonly activeUsers7d: number
  readonly sessions7d: number
  readonly events7d: number
  readonly errors7d: number
  readonly p95DurationMs: number | null
  readonly lastSignalAt: string | null
  readonly appVersion: string | null
}

export interface TelemetryAlert {
  readonly appId: string
  readonly code: "NO_INGESTION" | "APP_SILENT" | "ERROR_SPIKE"
  readonly severity: "warning" | "critical"
}

function propertiesOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function percentile95(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? null
}

export function summarizePersistentTelemetry(
  rows: readonly PersistentTelemetryRow[],
  appIds: readonly string[],
  now = new Date(),
): { readonly apps: readonly TelemetryAppSummary[]; readonly alerts: readonly TelemetryAlert[] } {
  const since24h = now.getTime() - 24 * 60 * 60 * 1000
  const since7d = now.getTime() - 7 * 24 * 60 * 60 * 1000
  const alerts: TelemetryAlert[] = []
  const apps = appIds.map((appId) => {
    const appRows = rows.filter((row) => row.appId === appId && row.occurredAt.getTime() >= since7d)
    const users24h = new Set<string>()
    const users7d = new Set<string>()
    const sessions = new Set<string>()
    const durations: number[] = []
    let errors = 0
    let last: PersistentTelemetryRow | undefined
    for (const row of appRows) {
      const properties = propertiesOf(row.properties)
      if (typeof properties.subjectHash === "string") {
        users7d.add(properties.subjectHash)
        if (row.occurredAt.getTime() >= since24h) users24h.add(properties.subjectHash)
      }
      if (typeof properties.sessionHash === "string") sessions.add(properties.sessionHash)
      if (typeof properties.durationMs === "number" && Number.isFinite(properties.durationMs) && properties.durationMs >= 0) durations.push(properties.durationMs)
      if (row.eventName.includes("error") || properties.error === true) errors += 1
      if (!last || row.occurredAt > last.occurredAt) last = row
    }
    if (!last) alerts.push({ appId, code: "NO_INGESTION", severity: "critical" })
    else if (now.getTime() - last.occurredAt.getTime() > 15 * 60 * 1000) alerts.push({ appId, code: "APP_SILENT", severity: "warning" })
    if (appRows.length >= 20 && errors / appRows.length > 0.05) alerts.push({ appId, code: "ERROR_SPIKE", severity: "critical" })
    const lastProperties = propertiesOf(last?.properties)
    return {
      appId,
      activeUsers24h: users24h.size,
      activeUsers7d: users7d.size,
      sessions7d: sessions.size,
      events7d: appRows.length,
      errors7d: errors,
      p95DurationMs: percentile95(durations),
      lastSignalAt: last?.occurredAt.toISOString() ?? null,
      appVersion: typeof lastProperties.appVersion === "string" ? lastProperties.appVersion : null,
    }
  })
  return { apps, alerts }
}
