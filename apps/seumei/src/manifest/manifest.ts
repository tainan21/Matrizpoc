/**
 * Seumei — App Manifest (source of truth per L2).
 */
import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "seumei",
  name: "Seumei",
  description:
    "Gestao de estabelecimentos e operacao. Permite selecionar estabelecimento e gerar contrato via Contracts.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Dashboard", path: "/", order: 0 },
    { label: "Estabelecimentos", path: "/establishments", order: 1 },
    { label: "Onboarding", path: "/onboarding", order: 2 },
  ],
  capabilities: [
    {
      id: "seumei.establishment.read",
      name: "Ler estabelecimentos",
      description: "Lista estabelecimentos do tenant.",
    },
    {
      id: "seumei.establishment.select",
      name: "Selecionar estabelecimento",
      description: "Marca um estabelecimento como ativo.",
    },
    {
      id: "seumei.contract.request",
      name: "Solicitar contrato",
      description: "Solicita geracao de contrato a partir de estabelecimento.",
    },
  ],
  eventsProduced: ["seumei.establishment.selected"],
  eventsConsumed: ["onboarding.completed", "contract.created"],
  integrations: [
    {
      targetAppId: "contracts",
      kind: "gateway",
      description: "Gera contrato a partir de estabelecimento.",
    },
    {
      targetAppId: "contracts",
      kind: "external-link",
      description: "Vinculo externo do estabelecimento com contrato.",
    },
  ],
  onboardingSupport: {
    participates: true,
    hasSpecificStep: true,
    specificStepTitle: "Perfil de estabelecimento",
  },
  navigationEntry: { label: "Seumei", path: "/", order: 2 },
  ownership: {
    domainSummary: "Dominio de estabelecimentos e operacao.",
    maintainers: ["matriz-seumei"],
  },
  widgets: [
    {
      id: "seumei.widget.active-establishment",
      name: "Estabelecimento ativo",
      description: "Mostra o estabelecimento em uso.",
    },
  ],
}

export type SeumeiManifest = typeof manifest
