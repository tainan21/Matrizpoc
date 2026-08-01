import type { AppManifestDTO } from "@matriz/integration-api-contracts"

export const manifest: AppManifestDTO = {
  appId: "sites",
  name: "Matriz Sites",
  description:
    "Coleção de sites configuráveis com metadata, i18n, assets e renderer reutilizável.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [
    { label: "Catálogo", path: "/", order: 0 },
    { label: "Exemplo", path: "/preview/example/pt-BR", order: 1 },
  ],
  capabilities: [
    {
      id: "sites.catalog.read",
      name: "Ler catálogo de sites",
      description: "Lista sites e saúde da configuração sem executar código externo.",
    },
    {
      id: "sites.preview.render",
      name: "Renderizar preview",
      description: "Renderiza um site por configuração, locale e preset.",
    },
    {
      id: "sites.metadata.generate",
      name: "Gerar metadata",
      description: "Produz metadata, social cards, sitemap e robots a partir do catálogo.",
    },
  ],
  eventsProduced: [],
  eventsConsumed: [],
  integrations: [],
  onboardingSupport: { participates: true, hasSpecificStep: false },
  navigationEntry: { label: "Sites", path: "/", order: 6 },
  ownership: {
    domainSummary:
      "Catálogo e runtime de sites; cada site possui conteúdo e identidade, não domínio forte de produto.",
    maintainers: ["matriz-sites"],
  },
  widgets: [
    {
      id: "sites.widget.catalog-health",
      name: "Saúde do catálogo",
      description: "Resume locales, assets e metadata dos sites.",
    },
  ],
}

export type SitesManifest = typeof manifest
