import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "seumei",
  name: "Seumei",
  description: "Operação multitenant para configurar, publicar e gerir empresas.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [{ label: "Início", path: "/", order: 0 }, { label: "Entrar", path: "/login", order: 1 }],
  capabilities: [{ id: "seumei.establishment.read", name: "Ler empresa", description: "Lê a empresa do tenant ativo." }],
  eventsProduced: ["seumei.establishment.selected"],
  eventsConsumed: ["onboarding.completed"],
  integrations: [],
  onboardingSupport: { participates: true, hasSpecificStep: true, specificStepTitle: "Configurar empresa" },
  navigationEntry: { label: "Seumei", path: "/", order: 3 },
  ownership: { domainSummary: "Empresa, catálogo, loja, pedidos e estoque multitenant.", maintainers: ["matriz-seumei"] },
  widgets: [],
}

export type SeumeiManifest = typeof manifest
