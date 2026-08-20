import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "seumei",
  name: "Seumei",
  description: "Empresas, onboarding e equipes multitenant com autoridade server-side.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Empresas", path: "/", order: 0 },
    { label: "Configuração", path: "/onboarding", order: 1 },
    { label: "Workspace", path: "/workspace", order: 2 },
    { label: "Equipe", path: "/workspace/members", order: 3 },
    { label: "Aceitar convite", path: "/invite/[token]", order: 4 },
    { label: "Entrar", path: "/login", order: 5 },
  ],
  capabilities: [
    { id: "seumei.company.read", name: "Listar empresas", description: "Lista empresas autorizadas pela membership persistida." },
    { id: "seumei.company.create", name: "Criar empresa", description: "Cria tenant, empresa e membership inicial." },
    { id: "seumei.company.select", name: "Selecionar empresa", description: "Valida e seleciona uma empresa autorizada." },
    { id: "seumei.onboarding.update", name: "Configurar empresa", description: "Salva e conclui o onboarding persistente." },
    { id: "seumei.workspace.read", name: "Abrir workspace", description: "Abre o workspace de uma empresa ativa." },
    { id: "seumei.members.read", name: "Consultar equipe", description: "Lista membros e convites do tenant autorizado." },
    { id: "seumei.members.invite", name: "Convidar membros", description: "Cria convites app-scoped com token opaco e expiração." },
    { id: "seumei.members.manage", name: "Gerenciar equipe", description: "Altera papéis e remove memberships conforme capacidade." },
    { id: "seumei.invitation.accept", name: "Aceitar convite", description: "Aceita convite somente para a identidade autenticada correspondente." },
  ],
  eventsProduced: ["seumei.establishment.selected"],
  eventsConsumed: [],
  integrations: [],
  onboardingSupport: { participates: true, hasSpecificStep: true, specificStepTitle: "Configurar empresa" },
  navigationEntry: { label: "Seumei", path: "/", order: 3 },
  ownership: { domainSummary: "Empresa, onboarding, política de capacidades e workspace multitenant; Core persiste memberships.", maintainers: ["matriz-seumei"] },
  widgets: [],
}

export type SeumeiManifest = typeof manifest
