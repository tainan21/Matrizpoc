import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "matriz-control",
  name: "Matriz Control",
  description: "Cockpit operacional local para iniciar, observar e controlar processos conhecidos do ecossistema Matriz.",
  version: "0.2.0",
  contractVersion: "v1",
  primaryRoute: "/home",
  routes: [
    { label: "Início", path: "/home", order: 0 },
    { label: "Pulso", path: "/pulse", order: 1 },
    { label: "Apps", path: "/apps", order: 2 },
    { label: "Workspace", path: "/workspace", order: 3 },
    { label: "Agentes", path: "/agents", order: 4 },
    { label: "Ambientes", path: "/environments", order: 5 },
    { label: "Infraestrutura", path: "/infrastructure", order: 6 },
    { label: "Portas", path: "/ports", order: 7 },
    { label: "Git", path: "/git", order: 8 },
    { label: "Terminal", path: "/terminal", order: 9 },
    { label: "Navegador", path: "/browser", order: 10 },
    { label: "Ações", path: "/actions", order: 11 },
    { label: "Store", path: "/store", order: 12 },
    { label: "Doctor", path: "/doctor", order: 13 },
    { label: "Ajustes", path: "/settings", order: 14 },
  ],
  capabilities: [
    { id: "control.projects.operate", name: "Operar projetos locais", description: "Inicia ações declaradas e acompanha processos locais validados." },
    { id: "control.terminals.manage", name: "Gerenciar terminais", description: "Mantém múltiplas sessões em um dock global e na página Terminal." },
    { id: "control.browser.use", name: "Navegar localmente", description: "Opera abas Chromium reais no runtime desktop local." },
    { id: "control.browser.capsules", name: "Isolar contas", description: "Mantém perfis, cache e sessões separados por cápsula criptografada." },
    { id: "control.browser.automate", name: "Automatizar navegador", description: "Expõe ações tipadas a agentes por MCP local com políticas explícitas." },
  ],
  eventsProduced: [], eventsConsumed: [], integrations: [],
  onboardingSupport: { participates: true, hasSpecificStep: false },
  navigationEntry: { label: "Control", path: "/home", order: 2 },
  ownership: { domainSummary: "Tooling operacional local; não detém domínio dos produtos controlados.", maintainers: ["matriz-core"] },
  widgets: [{ id: "control.widget.processes", name: "Processos locais", description: "Resume sessões e estados operacionais conhecidos." }],
}

export type MatrizControlManifest = typeof manifest
