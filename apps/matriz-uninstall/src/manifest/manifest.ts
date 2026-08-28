import type { AppManifestDTO } from "@matriz/integration-api-contracts"
export const manifest: AppManifestDTO = {
  appId: "matriz-uninstall",
  name: "Matriz Uninstall",
  description: "Instala, atualiza, reinstala e remove produtos Windows do ecossistema Matriz.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [{ label: "Produtos", path: "/", order: 0 }],
  capabilities: [
    {
      id: "uninstall.products.inspect",
      name: "Inspecionar instalações",
      description: "Lê identidades registradas de produtos Matriz no Windows.",
    },
    {
      id: "uninstall.products.manage",
      name: "Gerenciar instalações",
      description: "Instala, atualiza, reinstala e desinstala produtos aprovados.",
    },
    {
      id: "uninstall.cleanup.manage",
      name: "Liberar espaço",
      description: "Remove somente cache, logs e temporários allowlisted.",
    },
  ],
  eventsProduced: [],
  eventsConsumed: [],
  integrations: [
    {
      targetAppId: "matriz-hub",
      kind: "gateway",
      description: "Consome o catálogo de distribuição v1.",
    },
  ],
  onboardingSupport: { participates: false, hasSpecificStep: false },
  navigationEntry: { label: "Uninstall", path: "/", order: 10 },
  ownership: {
    domainSummary: "Distribuição e manutenção local dos produtos Matriz no Windows.",
    maintainers: ["matriz-core"],
  },
  widgets: [],
}
