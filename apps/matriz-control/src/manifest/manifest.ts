import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "matriz-control",
  name: "Matriz Control",
  description: "Cockpit operacional local para iniciar, observar e controlar processos conhecidos do ecossistema Matriz.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/apps",
  routes: [
    { label: "Apps", path: "/apps", order: 0 },
    { label: "Workspace", path: "/workspace", order: 1 },
    { label: "Terminal", path: "/terminal", order: 2 },
    { label: "Ações", path: "/actions", order: 3 },
    { label: "Store", path: "/store", order: 4 },
    { label: "Doctor", path: "/doctor", order: 5 },
    { label: "Ajustes", path: "/settings", order: 6 },
  ],
  capabilities: [
    { id: "control.projects.operate", name: "Operar projetos locais", description: "Inicia ações declaradas e acompanha processos locais validados." },
    { id: "control.terminals.manage", name: "Gerenciar terminais", description: "Mantém múltiplas sessões em um dock global e na página Terminal." },
  ],
  eventsProduced: [], eventsConsumed: [], integrations: [],
  onboardingSupport: { participates: true, hasSpecificStep: false },
  navigationEntry: { label: "Control", path: "/apps", order: 2 },
  ownership: { domainSummary: "Tooling operacional local; não detém domínio dos produtos controlados.", maintainers: ["matriz-core"] },
  widgets: [{ id: "control.widget.processes", name: "Processos locais", description: "Resume sessões e estados operacionais conhecidos." }],
}

export type MatrizControlManifest = typeof manifest
