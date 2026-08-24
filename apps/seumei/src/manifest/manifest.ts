/**
 * Seumei — App Manifest (source of truth per L2).
 */
import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "seumei",
  name: "Seumei",
  description:
    "Business OS multiempresa com Hub, contexto operacional isolado e aplicativos instalados por empresa.",
  version: "0.2.0",
  contractVersion: "v1",
  primaryRoute: "/hub",
  routes: [
    { label: "Hub", path: "/hub", order: 0 },
    { label: "Empresas", path: "/hub", order: 1 },
    { label: "Estabelecimentos", path: "/establishments", order: 2 },
    { label: "Onboarding", path: "/onboarding", order: 3 },
  ],
  capabilities: [
    {
      id: "seumei.company.read",
      name: "Ler empresas",
      description: "Lista somente empresas ligadas à membership autenticada.",
    },
    {
      id: "seumei.apps.access",
      name: "Acessar aplicativos instalados",
      description: "Resolve instalação e permissão dentro do contexto da empresa.",
    },
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
  navigationEntry: { label: "Seumei", path: "/hub", order: 2 },
  ownership: {
    domainSummary: "Hub multiempresa, memberships, aplicativos instalados e operação isolada por tenant.",
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
