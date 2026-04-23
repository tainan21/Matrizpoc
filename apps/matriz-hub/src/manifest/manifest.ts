/**
 * Matriz Hub — App Manifest (source of truth per L2).
 *
 * L2: fonte unica de verdade do manifest deste app.
 * L3: arquivo unico que outros apps podem importar via public-contract.
 * L7: contractVersion: v1; qualquer evolucao vira v2 sem quebrar consumidores.
 */
import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "matriz-hub",
  name: "Matriz Hub",
  description:
    "Ponto central de entrada do ecossistema Matriz. Lista apps disponiveis, consolida eventos, external links, onboarding status e feature flags.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Inicio", path: "/", order: 0 },
    { label: "Catalogo de apps", path: "/catalog", order: 1 },
    { label: "Registry", path: "/registry", order: 2 },
    { label: "Eventos", path: "/events", order: 3 },
    { label: "External links", path: "/external-links", order: 4 },
    { label: "Onboarding status", path: "/onboarding-status", order: 5 },
    { label: "Feature flags", path: "/feature-flags", order: 6 },
    { label: "Telemetria", path: "/telemetry", order: 7 },
    { label: "Projects", path: "/projects", order: 10 },
    { label: "Health", path: "/health", order: 11 },
    { label: "Ecosystem", path: "/ecosystem", order: 12 },
    { label: "Intelligence", path: "/intelligence", order: 13 },
    { label: "Public", path: "/public", order: 14 },
  ],
  capabilities: [
    {
      id: "hub.catalog.read",
      name: "Ler catalogo de apps",
      description: "Lista apps registrados com manifest resumido e estado de onboarding.",
    },
    {
      id: "hub.registry.read",
      name: "Ler registry",
      description: "Consulta registry central de apps, capabilities e eventos.",
    },
    {
      id: "hub.events.read",
      name: "Ler eventos recentes",
      description: "Acompanha eventos emitidos no bus consolidado.",
    },
    {
      id: "hub.external-links.read",
      name: "Ler external links",
      description: "Lista vinculos entre entidades de apps distintos.",
    },
    {
      id: "hub.feature-flags.read",
      name: "Ler feature flags",
      description: "Consulta flags mock por tenant/app.",
    },
    {
      id: "hub.telemetry.read",
      name: "Ler telemetria consolidada",
      description: "Visualiza envelopes de telemetria de todos os apps registrados.",
    },
  ],
  eventsProduced: ["hub.app.opened"],
  eventsConsumed: [
    "onboarding.completed",
    "spot.gig.created",
    "seumei.establishment.selected",
    "contract.created",
    "contract.linked",
  ],
  integrations: [
    {
      targetAppId: "spot",
      kind: "event-consumer",
      description: "Consome eventos de criacao de gig para refletir no timeline.",
    },
    {
      targetAppId: "seumei",
      kind: "event-consumer",
      description: "Consome selecoes de estabelecimento.",
    },
    {
      targetAppId: "contracts",
      kind: "event-consumer",
      description: "Consome criacao/vinculo de contratos para mostrar no timeline.",
    },
    {
      targetAppId: "willdash",
      kind: "event-consumer",
      description: "Consome presenca do willdash no ecossistema.",
    },
  ],
  onboardingSupport: {
    participates: true,
    hasSpecificStep: false,
  },
  navigationEntry: {
    label: "Matriz Hub",
    path: "/",
    order: 0,
  },
  ownership: {
    domainSummary: "Ponto de entrada do ecossistema. Nao detem dominio de negocio.",
    maintainers: ["matriz-core"],
  },
  widgets: [
    {
      id: "hub.widget.catalog",
      name: "Catalogo compacto",
      description: "Lista resumida dos apps habilitados.",
    },
    {
      id: "hub.widget.timeline",
      name: "Timeline de eventos",
      description: "Exibe os ultimos eventos do bus.",
    },
  ],
}

export type MatrizHubManifest = typeof manifest
