import type { AppManifestDTO } from "@matriz/integration-api-contracts"
export const manifest: AppManifestDTO = {
  appId: "matriz-client-admin",
  name: "Matriz Client Admin",
  description: "Visão simples e confiável da operação de cada cliente Matriz.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Visão geral", path: "/", order: 0 }, { label: "Sistemas", path: "/systems", order: 1 },
    { label: "Site", path: "/site", order: 2 }, { label: "Pagamentos", path: "/payments", order: 3 },
    { label: "Integrações", path: "/integrations", order: 4 },
  ],
  capabilities: [
    { id: "client-admin.dashboard.read", name: "Ler painel do cliente", description: "Consulta projeções administrativas do tenant ativo." },
    { id: "client-admin.refresh", name: "Atualizar painel", description: "Solicita atualização das fontes configuradas." },
  ],
  eventsProduced: [], eventsConsumed: [], integrations: [{ targetAppId: "matriz-hub", kind: "gateway", description: "Consulta projeções tenant-scoped do Client Admin." }],
  onboardingSupport: { participates: false, hasSpecificStep: false }, navigationEntry: { label: "Client Admin", path: "/", order: 9 },
  ownership: { domainSummary: "Experiência client-facing para projeções administrativas; não possui banco próprio.", maintainers: ["matriz-client-admin"] }, widgets: [],
}
export type MatrizClientAdminManifest = typeof manifest
