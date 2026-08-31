import type { ClientAdminDashboard, ClientAdminDataState, ClientAdminSection } from "@matriz/integration-api-contracts"
import type { ClientPortalData } from "./domain"
import type { ClientAdminDashboardCache, ClientAdminRepository } from "./ports"

const unavailableError = { code: "DATA_UNAVAILABLE", message: "Não foi possível atualizar esta informação agora." } as const

function section(state: ClientAdminDataState, data: unknown, asOf: string | null = null): ClientAdminSection {
  return { state, data, asOf, lastSuccessAt: asOf, error: null }
}

function buildDashboard(input: { tenantId: string; tenantName: string }, data: ClientPortalData, now: string): ClientAdminDashboard {
  const unavailableSections = new Set(data.unavailableSections ?? [])
  const systems = data.systems.map((system) => {
    const latest = [...data.snapshots].filter((snapshot) => data.sources.some((source) => source.id === snapshot.sourceId && source.systemId === system.id)).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0]
    return { id: system.id, name: system.name, purpose: system.purpose, category: system.category, publicUrl: system.publicUrl, availability: latest?.state ?? "empty", lastObservedAt: latest?.capturedAt ?? null }
  })
  const configuredProviders = new Set(data.sources.map((source) => source.provider))
  const integrations = [
    ...data.sources.map((source) => ({ id: source.id, provider: source.provider, label: source.label, state: source.state, lastAttemptAt: source.lastAttemptAt, lastSuccessAt: source.lastSuccessAt })),
    ...(!configuredProviders.has("vercel") ? [{ id: "vercel", provider: "vercel" as const, label: "Vercel", state: "not_configured" as const, lastAttemptAt: null, lastSuccessAt: null }] : []),
    ...(!configuredProviders.has("ga4") ? [{ id: "ga4", provider: "ga4" as const, label: "Google Analytics", state: "not_configured" as const, lastAttemptAt: null, lastSuccessAt: null }] : []),
  ]
  const payments = data.payments.map(({ tenantId: _tenantId, externalReference: _externalReference, lastSyncedAt: _lastSyncedAt, ...payment }) => payment)
  const pending = payments.filter((payment) => payment.status === "pending" || payment.status === "overdue")
  const pendingTotal = pending.reduce((sum, payment) => sum + payment.amountCents, 0)
  const metrics = [
    ...(systems.length ? [{ id: "systems-total", label: "Sistemas cadastrados", value: systems.length, unit: null, state: "fresh" as const, change: null }] : []),
    ...(pending.length ? [{ id: "payments-pending", label: "Pagamentos pendentes", value: pendingTotal, unit: "BRL centavos", state: "fresh" as const, change: null }] : []),
  ]
  const attention = [
    ...integrations.filter((item) => item.state === "not_configured").map((item) => ({ id: `configure-${item.id}`, severity: "info" as const, title: `${item.label} não configurado`, detail: "A integração poderá ser ativada por configuração de ambiente.", href: "/integrations" })),
    ...payments.filter((payment) => payment.status === "overdue").map((payment) => ({ id: `overdue-${payment.id}`, severity: "critical" as const, title: "Pagamento vencido", detail: payment.description, href: "/payments" })),
  ]
  const snapshotAsOf = [...data.snapshots].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0]?.capturedAt ?? null
  return {
    tenant: { id: input.tenantId, name: input.tenantName },
    generatedAt: now,
    metrics,
    attention,
    sections: {
      systems: section(unavailableSections.has("systems") ? "unavailable" : systems.length ? "fresh" : "empty", systems, systems.length ? now : null),
      site: section(unavailableSections.has("site") ? "unavailable" : snapshotAsOf ? "fresh" : "not_configured", data.snapshots.filter((snapshot) => snapshot.kind === "site" || snapshot.kind === "analytics"), snapshotAsOf),
      payments: section(unavailableSections.has("payments") ? "unavailable" : payments.length ? "fresh" : "empty", payments, payments.length ? now : null),
      integrations: section(unavailableSections.has("integrations") ? "unavailable" : integrations.some((item) => item.state !== "not_configured") ? "fresh" : "not_configured", integrations, data.sources.map((source) => source.lastSuccessAt).filter(Boolean).sort().at(-1) ?? null),
    },
  }
}

function staleDashboard(dashboard: ClientAdminDashboard): ClientAdminDashboard {
  const stale = (value: ClientAdminSection): ClientAdminSection => ({ ...value, state: "stale", error: unavailableError })
  return { ...dashboard, generatedAt: new Date().toISOString(), sections: { systems: stale(dashboard.sections.systems), site: stale(dashboard.sections.site), payments: stale(dashboard.sections.payments), integrations: stale(dashboard.sections.integrations) } }
}

export function createClientAdminService(dependencies: { repository: ClientAdminRepository; cache?: ClientAdminDashboardCache; now?: () => Date }) {
  return {
    async refresh(input: { tenantId: string; tenantName: string }): Promise<ClientAdminDashboard> {
      await dependencies.repository.refresh?.(input.tenantId)
      return this.dashboard(input)
    },
    async dashboard(input: { tenantId: string; tenantName: string }): Promise<ClientAdminDashboard> {
      try {
        const data = await dependencies.repository.load(input.tenantId)
        let dashboard = buildDashboard(input, data, (dependencies.now ?? (() => new Date()))().toISOString())
        if (data.unavailableSections?.length) {
          const cached = await dependencies.cache?.read(input.tenantId).catch(() => null)
          if (cached) {
            const sections = { ...dashboard.sections }
            for (const name of data.unavailableSections) sections[name] = { ...cached.sections[name], state: "stale", error: unavailableError }
            dashboard = { ...dashboard, sections }
          }
        }
        await dependencies.cache?.write(input.tenantId, dashboard).catch(() => undefined)
        return dashboard
      } catch {
        const cached = await dependencies.cache?.read(input.tenantId).catch(() => null)
        if (cached) return staleDashboard(cached)
        const empty = buildDashboard(input, { systems: [], sources: [], snapshots: [], payments: [] }, new Date().toISOString())
        const unavailable = (value: ClientAdminSection): ClientAdminSection => ({ ...value, state: "unavailable", error: unavailableError })
        return { ...empty, sections: { systems: unavailable(empty.sections.systems), site: unavailable(empty.sections.site), payments: unavailable(empty.sections.payments), integrations: unavailable(empty.sections.integrations) } }
      }
    },
  }
}
