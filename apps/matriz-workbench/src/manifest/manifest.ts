import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "matriz-workbench",
  name: "Matriz Workbench",
  description:
    "Workspace local-first para roadmap, backlog, documentação e coworking entre pessoas, Codex e agentes.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Foco", path: "/", order: 0 },
    { label: "Controle", path: "/control", order: 1 },
    { label: "Trabalho", path: "/work/inbox", order: 2 },
    { label: "Projetos", path: "/projects", order: 3 },
    { label: "Configurações", path: "/settings", order: 4 },
    { label: "Praticies", path: "/praticies", order: 5 },
  ],
  capabilities: [
    {
      id: "workbench.projects.discover",
      name: "Descobrir projetos",
      description: "Detecta apps locais sem executar código de outro produto.",
    },
    {
      id: "workbench.planning.manage",
      name: "Gerenciar trabalho",
      description: "Mantém roadmap, backlog, documentação e decisões em arquivos Git.",
    },
    {
      id: "workbench.agents.coordinate",
      name: "Coordenar agentes",
      description: "Entrega contexto compacto e registra execução por MCP local.",
    },
    {
      id: "workbench.praticies.use",
      name: "Usar praticidades locais",
      description: "Instala e acessa automações, snippets, atalhos e gadgets locais.",
    },
  ],
  eventsProduced: [],
  eventsConsumed: [],
  integrations: [],
  onboardingSupport: { participates: true, hasSpecificStep: false },
  navigationEntry: { label: "Workbench", path: "/", order: 1 },
  ownership: {
    domainSummary: "Tooling de coordenação local do ecossistema; não detém domínio de produto.",
    maintainers: ["matriz-core"],
  },
  widgets: [
    {
      id: "workbench.widget.focus",
      name: "Foco atual",
      description: "Resume itens ativos, bloqueios e solicitações de agentes.",
    },
  ],
}

export type MatrizWorkbenchManifest = typeof manifest
