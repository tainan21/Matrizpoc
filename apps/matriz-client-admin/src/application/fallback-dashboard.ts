import type { ClientAdminDashboard, ClientAdminSection } from "@matriz/integration-api-contracts"

const unavailable = (data: unknown): ClientAdminSection => ({
  state: "unavailable",
  asOf: null,
  lastSuccessAt: null,
  error: { code: "DATA_UNAVAILABLE", message: "Não foi possível carregar esta informação agora." },
  data,
})

export function unavailableDashboard(tenantId: string, tenantName: string): ClientAdminDashboard {
  return {
    tenant: { id: tenantId, name: tenantName },
    generatedAt: new Date().toISOString(),
    metrics: [],
    attention: [],
    sections: {
      systems: unavailable([]),
      site: unavailable(null),
      payments: unavailable([]),
      integrations: unavailable([]),
    },
  }
}
