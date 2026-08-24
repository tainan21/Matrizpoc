/**
 * MatrizLib app manifest (L2 source of truth).
 */
import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "matrizlib",
  name: "MatrizLib",
  description: "Portal público de referência para componentes, temas e sons Matriz.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Início", path: "/", order: 0 },
    { label: "Componentes", path: "/components", order: 1 },
    { label: "Componente", path: "/components/[slug]", order: 2 },
    { label: "Temas", path: "/themes", order: 3 },
    { label: "Sons", path: "/sounds", order: 4 },
    { label: "Arquitetura", path: "/architecture", order: 5 },
  ],
  capabilities: [
    {
      id: "matrizlib.catalog.read",
      name: "Consultar catálogo",
      description: "Documenta componentes e seus contratos públicos.",
    },
    {
      id: "matrizlib.themes.read",
      name: "Consultar temas",
      description: "Demonstra temas canônicos sem duplicar tokens.",
    },
    {
      id: "matrizlib.sounds.read",
      name: "Consultar sons",
      description: "Documenta eventos sonoros semânticos, packs e preferências globais.",
    },
    {
      id: "matrizlib.architecture.read",
      name: "Consultar arquitetura",
      description: "Explica os limites de pacotes e a migração incremental.",
    },
  ],
  eventsProduced: [],
  eventsConsumed: [],
  integrations: [],
  onboardingSupport: {
    participates: true,
    hasSpecificStep: true,
    specificStepTitle: "Conheça componentes, temas e sons",
  },
  navigationEntry: { label: "MatrizLib", path: "/", order: 7 },
  ownership: {
    domainSummary: "Portal público de referência de design, sem domínio forte de produto.",
    maintainers: ["matriz-design"],
  },
  widgets: [],
}

export type MatrizLibManifest = typeof manifest
