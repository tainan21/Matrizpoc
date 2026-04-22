/**
 * Contracts — App Manifest (source of truth per L2).
 */
import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "contracts",
  name: "Contracts",
  description:
    "Geracao, versionamento e historico de contratos. Recebe contexto de Spot e Seumei via DTOs e adapters, emite eventos e external links.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Dashboard", path: "/", order: 0 },
    { label: "Contratos", path: "/contracts", order: 1 },
    { label: "Templates", path: "/templates", order: 2 },
  ],
  capabilities: [
    {
      id: "contracts.contract.create",
      name: "Criar contrato",
      description: "Cria contrato a partir de input cru.",
    },
    {
      id: "contracts.contract.from-gig",
      name: "Criar a partir de gig",
      description: "Cria contrato a partir de CreateContractFromGigInput.",
    },
    {
      id: "contracts.contract.from-establishment",
      name: "Criar a partir de estabelecimento",
      description: "Cria contrato a partir de CreateContractFromEstablishmentInput.",
    },
    {
      id: "contracts.contract.read",
      name: "Ler contratos",
      description: "Lista e detalha contratos.",
    },
  ],
  eventsProduced: ["contract.created", "contract.linked"],
  eventsConsumed: ["spot.gig.created", "seumei.establishment.selected"],
  integrations: [
    {
      targetAppId: "spot",
      kind: "external-link",
      description: "Vinculos externos para gig de origem.",
    },
    {
      targetAppId: "seumei",
      kind: "external-link",
      description: "Vinculos externos para estabelecimento de origem.",
    },
  ],
  onboardingSupport: {
    participates: true,
    hasSpecificStep: true,
    specificStepTitle: "Modelo padrao de contrato",
  },
  navigationEntry: { label: "Contracts", path: "/", order: 3 },
  ownership: {
    domainSummary: "Dominio de contratos, partes, versoes e historico.",
    maintainers: ["matriz-contracts"],
  },
  widgets: [
    {
      id: "contracts.widget.recent",
      name: "Contratos recentes",
      description: "Ultimos contratos criados.",
    },
  ],
}

export type ContractsManifest = typeof manifest
