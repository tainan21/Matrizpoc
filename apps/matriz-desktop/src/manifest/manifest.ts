import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "matriz-desktop",
  name: "Matriz Control",
  description: "Utility nativa para portas, processos e operações locais do ecossistema Matriz.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [{ label: "Control", path: "/", order: 0 }],
  capabilities: [
    { id: "desktop.ports.manage", name: "Gerenciar portas", description: "Inspeciona portas TCP e encerra processos observados com segurança." },
    { id: "desktop.apps.launch", name: "Operar apps", description: "Inicia e encerra apenas aplicações Matriz allowlisted." },
    { id: "desktop.health.read", name: "Ler saúde local", description: "Resume readiness, workspace e ambiente de desenvolvimento." },
  ],
  eventsProduced: [],
  eventsConsumed: [],
  integrations: [],
  onboardingSupport: { participates: false, hasSpecificStep: false },
  navigationEntry: { label: "Control", path: "/", order: 8 },
  ownership: {
    domainSummary: "Tooling desktop local do ecossistema, sem domínio forte de produto.",
    maintainers: ["matriz-core"],
  },
  widgets: [],
}

export type MatrizDesktopManifest = typeof manifest
