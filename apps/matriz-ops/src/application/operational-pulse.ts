import { getOpsDb } from "@matriz/platform-db/ops"

interface TelemetrySummary { apps: Array<{ appId: string; activeUsers24h: number; activeUsers7d: number; sessions7d: number; events7d: number; errors7d: number; p95DurationMs: number | null; lastSignalAt: string | null; appVersion: string | null }>; alerts: Array<{ appId: string; code: string; severity: "warning" | "critical" }> }
interface PayOverview { wallets: number; balances: { MTRZ: string; BRL: string }; pendingBrlIntents: number; openDiscrepancies: number; deadLetters: number; lastProviderEvent: null | { status: string; receivedAt: string; processedAt: string | null }; lastReconciliation: null | { status: string; finishedAt: string | null } }
interface PayReconciliation { status: "NOT_RUN" | "RUNNING" | "HEALTHY" | "DIVERGENT" | "FAILED" | "STALE"; checkedAt: string | null; openDiscrepancies: number; outgoingTransfersBlocked: boolean }

export function presentReconciliation(value: PayReconciliation | null) {
  if (!value) return { id: "reconciliation", label: "Reconciliação", status: "critical", detail: "sem leitura · saídas BRL bloqueadas" } as const
  if (value.status === "NOT_RUN") return { id: "reconciliation", label: "Reconciliação", status: "warning", detail: "nunca executada · saídas BRL bloqueadas" } as const
  if (value.status === "HEALTHY" && !value.outgoingTransfersBlocked) return { id: "reconciliation", label: "Reconciliação", status: "normal", detail: value.checkedAt ? `saudável · ${value.checkedAt}` : "saudável" } as const
  const severity = value.status === "RUNNING" ? "warning" : "critical"
  return { id: "reconciliation", label: "Reconciliação", status: severity, detail: `${value.status.toLowerCase()} · saídas BRL bloqueadas` } as const
}

async function jsonFetch<T>(url: string, token?: string): Promise<T | null> {
  try { const response = await fetch(url, { headers: token ? { authorization: `Bearer ${token}`, "x-matriz-actor-id": "service:matriz-ops" } : {}, cache: "no-store", signal: AbortSignal.timeout(3000) }); return response.ok ? await response.json() as T : null } catch { return null }
}

export async function loadOperationalPulse() {
  const hub = process.env.MATRIZ_HUB_INTERNAL_URL ?? "http://127.0.0.1:3000"
  const pay = process.env.MATRIZ_PAY_INTERNAL_URL ?? "http://127.0.0.1:3012"
  const [hubHealth, payHealth, telemetry, payOverview, reconciliation, audit] = await Promise.all([
    jsonFetch<Record<string, unknown>>(`${hub}/api/health`), jsonFetch<Record<string, unknown>>(`${pay}/api/health`),
    jsonFetch<TelemetrySummary>(`${hub}/api/v1/telemetry/summary`, process.env.MATRIZ_TELEMETRY_INGEST_TOKEN),
    jsonFetch<PayOverview>(`${pay}/api/v1/overview`, process.env.MATRIZ_OPS_SERVICE_TOKEN),
    jsonFetch<PayReconciliation>(`${pay}/api/v1/reconciliation`, process.env.MATRIZ_OPS_SERVICE_TOKEN),
    getOpsDb().opsAuditEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 6, select: { id: true, action: true, targetType: true, targetId: true, actorRole: true, reason: true, occurredAt: true } }),
  ])
  const allEvents = telemetry?.apps.reduce((sum, app) => sum + app.events7d, 0) ?? 0
  const allErrors = telemetry?.apps.reduce((sum, app) => sum + app.errors7d, 0) ?? 0
  const lastSignalAt = telemetry?.apps.map((app) => app.lastSignalAt).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null
  const tunnelUrl = process.env.MATRIZ_PUBLIC_TUNNEL_URL
  const tunnelOk = tunnelUrl ? Boolean(await jsonFetch<Record<string, unknown>>(`${tunnelUrl.replace(/\/$/, "")}/api/health`)) : false
  return {
    updatedAt: new Date().toISOString(),
    services: [
      { id: "hub", label: "Matriz Hub", status: hubHealth ? "normal" : "critical", detail: hubHealth ? "respondendo" : "indisponível" },
      { id: "pay", label: "Matriz Pay", status: payHealth ? "normal" : "critical", detail: payHealth ? "ledger conectado" : "indisponível" },
      { id: "ingestion", label: "Ingestão", status: telemetry ? (lastSignalAt ? "normal" : "warning") : "critical", detail: lastSignalAt ? `último sinal ${lastSignalAt}` : "sem sinal persistido" },
      presentReconciliation(reconciliation),
      { id: "tunnel", label: "Tunnel", status: tunnelOk ? "normal" : tunnelUrl ? "critical" : "warning", detail: tunnelUrl ? (tunnelOk ? "endpoint público ativo" : "endpoint sem resposta") : "não configurado" },
      { id: "celcoin", label: "Celcoin", status: payOverview?.deadLetters ? "critical" : payOverview?.lastProviderEvent ? "normal" : "warning", detail: payOverview?.lastProviderEvent ? `último evento ${payOverview.lastProviderEvent.receivedAt}` : "sem evento recebido" },
    ] as const,
    telemetry: { apps: telemetry?.apps ?? [], alerts: telemetry?.alerts ?? [], events7d: allEvents, errors7d: allErrors, lastSignalAt },
    pay: payOverview ?? { wallets: 0, balances: { MTRZ: "0", BRL: "0" }, pendingBrlIntents: 0, openDiscrepancies: 0, deadLetters: 0, lastProviderEvent: null, lastReconciliation: null },
    audit: audit.map((event) => ({ ...event, occurredAt: event.occurredAt.toISOString() })),
  }
}
