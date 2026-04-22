/**
 * Spot — App Manifest (source of truth per L2).
 */
import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "spot",
  name: "Spot",
  description:
    "Gestao de bandas, perfis artisticos, gigs e bookings. Cria gigs que podem ser convertidas em contrato pelo app Contracts.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Dashboard", path: "/", order: 0 },
    { label: "Gigs", path: "/gigs", order: 1 },
    { label: "Bandas", path: "/bands", order: 2 },
    { label: "Onboarding", path: "/onboarding", order: 3 },
  ],
  capabilities: [
    { id: "spot.gig.create", name: "Criar gig", description: "Cria um novo gig mock." },
    { id: "spot.gig.read", name: "Ler gigs", description: "Lista e detalha gigs do tenant." },
    { id: "spot.band.read", name: "Ler bandas", description: "Lista bandas cadastradas." },
    {
      id: "spot.gig.request-contract",
      name: "Solicitar contrato",
      description: "Envia um gig para o app Contracts gerar contrato.",
    },
  ],
  eventsProduced: ["spot.gig.created"],
  eventsConsumed: ["onboarding.completed", "contract.created"],
  integrations: [
    {
      targetAppId: "contracts",
      kind: "gateway",
      description: "Chama gateway do Contracts para gerar contrato a partir de gig.",
    },
    {
      targetAppId: "contracts",
      kind: "external-link",
      description: "Vinculo externo do gig com o contrato gerado.",
    },
  ],
  onboardingSupport: {
    participates: true,
    hasSpecificStep: true,
    specificStepTitle: "Perfil artistico Spot",
  },
  navigationEntry: { label: "Spot", path: "/", order: 1 },
  ownership: {
    domainSummary: "Dominio de bandas/gigs/bookings.",
    maintainers: ["matriz-spot"],
  },
  widgets: [
    {
      id: "spot.widget.upcoming-gigs",
      name: "Proximos gigs",
      description: "Resumo dos gigs mais proximos.",
    },
  ],
}

export type SpotManifest = typeof manifest
