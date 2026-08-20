import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "seumei",
  name: "Seumei",
  description: "Criação, configuração e workspace multitenant de empresas.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Empresas", path: "/", order: 0 },
    { label: "Configuração", path: "/onboarding", order: 1 },
    { label: "Workspace", path: "/workspace", order: 2 },
    { label: "Entrar", path: "/login", order: 3 },
  ],
  capabilities: [
    { id: "seumei.company.read", name: "Listar empresas", description: "Lista empresas autorizadas pela membership persistida." },
    { id: "seumei.company.create", name: "Criar empresa", description: "Cria tenant, empresa e membership inicial." },
    { id: "seumei.company.select", name: "Selecionar empresa", description: "Valida e seleciona uma empresa autorizada." },
    { id: "seumei.onboarding.update", name: "Configurar empresa", description: "Salva e conclui o onboarding persistente." },
    { id: "seumei.workspace.read", name: "Abrir workspace", description: "Abre o workspace de uma empresa ativa." },
  ],
  eventsProduced: ["seumei.establishment.selected"],
  eventsConsumed: [],
  integrations: [],
  onboardingSupport: { participates: true, hasSpecificStep: true, specificStepTitle: "Configurar empresa" },
  navigationEntry: { label: "Seumei", path: "/", order: 3 },
  ownership: { domainSummary: "Empresa, membership aplicada, onboarding e workspace multitenant.", maintainers: ["matriz-seumei"] },
  widgets: [],
}

export type SeumeiManifest = typeof manifest
