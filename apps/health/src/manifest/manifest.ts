import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "health",
  name: "Health",
  description: "Observabilidade local leve para recursos e processos do Windows.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [{ label: "Visão geral", path: "/", order: 0 }],
  capabilities: [{ id: "health.system.observe", name: "Observar sistema", description: "Lê métricas locais sem controlar processos." }],
  eventsProduced: [], eventsConsumed: [], integrations: [],
  onboardingSupport: { participates: true, hasSpecificStep: false },
  navigationEntry: { label: "Health", path: "/", icon: "health", order: 9 },
  ownership: { domainSummary: "Observabilidade local do computador; não controla produtos nem processos.", maintainers: ["matriz-core"] },
  widgets: [{ id: "health.widget.system", name: "Saúde do sistema", description: "Resume CPU, memória e sensores disponíveis." }],
}

export type HealthManifest = typeof manifest
