import type { ClientAdminDashboard, ClientAdminDataState, ClientAdminSection } from "@matriz/integration-api-contracts"

const stateLabels: Record<ClientAdminDataState, string> = {
  fresh: "Atualizado",
  stale: "Dados antigos",
  empty: "Sem registros",
  not_configured: "Não configurado",
  unavailable: "Indisponível",
  error: "Erro ao carregar",
}

function count(section: ClientAdminSection): string {
  return Array.isArray(section.data) && section.state !== "unavailable" && section.state !== "error" ? String(section.data.length) : "Sem dados"
}

export function presentDashboard(dashboard: ClientAdminDashboard) {
  const states = Object.values(dashboard.sections).map((section) => section.state)
  const statusLabel = states.every((state) => state === "fresh" || state === "empty")
    ? "Tudo verificado"
    : states.some((state) => state === "error" || state === "unavailable")
      ? "Informações indisponíveis"
      : states.some((state) => state === "stale") ? "Dados desatualizados" : "Configuração pendente"
  const sectionView = (section: ClientAdminSection) => ({ state: section.state, stateLabel: stateLabels[section.state], valueLabel: count(section), asOf: section.asOf, error: section.error })
  return {
    productName: `Admin ${dashboard.tenant.name}`,
    tenantName: dashboard.tenant.name,
    statusLabel,
    generatedAt: dashboard.generatedAt,
    metrics: dashboard.metrics,
    attention: dashboard.attention,
    sections: {
      systems: sectionView(dashboard.sections.systems),
      site: sectionView(dashboard.sections.site),
      payments: sectionView(dashboard.sections.payments),
      integrations: sectionView(dashboard.sections.integrations),
    },
  }
}
