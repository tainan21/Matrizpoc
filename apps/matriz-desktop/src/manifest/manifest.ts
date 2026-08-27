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
    { id: "desktop.terminal.manage", name: "Operar terminal", description: "Hospeda sessões PowerShell isoladas e operações Matriz observáveis." },
    { id: "desktop.native.launch", name: "Operar apps nativos", description: "Gera, instala e inicia entregas desktop allowlisted." },
    { id: "desktop.environment.manage", name: "Gerenciar ambientes", description: "Edita, compara, promove e valida ambientes sem expor segredos." },
    { id: "desktop.workspace.explore", name: "Explorar workspace", description: "Inspeciona recursos confinados aos apps do catálogo." },
    { id: "desktop.store.install", name: "Instalar capacidades", description: "Instala e ativa pacotes Matriz confiáveis com consentimento, recibo local e alvo de runtime validado." },
    { id: "desktop.runbooks.execute", name: "Executar runbooks", description: "Executa sequências operacionais nativas fixas por app." },
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
