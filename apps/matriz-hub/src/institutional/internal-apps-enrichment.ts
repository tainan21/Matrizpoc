/**
 * Internal apps institutional enrichment (Hub-side).
 *
 * Cada app interno da POC ja tem seu AppManifestDTO tecnico (L2) exposto via
 * public-contract. A camada institucional V1.2 NAO altera esses manifests:
 * ela apenas fornece uma DECORATION institucional (brand, ownership, tags,
 * links, health baseline, metrics) que o LocalContractImportAdapter usa para
 * derivar um ProjectManifest institucional.
 *
 * Este arquivo vive dentro do matriz-hub (control plane), NAO nos apps
 * origem. Isso preserva L3 (apps internos expoem apenas manifest-only via
 * public-contract) e L12 (pacotes compartilhados/contracts nao carregam
 * dominio forte).
 */
import type { AppManifestDTO } from "@matriz/integration-api-contracts"
import type { InstitutionalAppDecoration } from "@matriz/integration-ingestion"

type Decoration = InstitutionalAppDecoration

const DECORATIONS: Record<string, Decoration> = {
  "matriz-hub": {
    projectId: "matriz:hub",
    brand: {
      brandName: "Matriz Hub",
      tagline: "Control plane institucional do ecossistema Matriz",
      primaryColor: "#111827",
      accentColor: "#6366f1",
      logoText: "MH",
      tone: "institutional",
    },
    trustLevel: "core",
    institutionalTags: ["public", "control-plane"],
    ownership: {
      owner: "matriz-core",
      contact: "core@matriz.example",
      repo: "https://github.com/matriz/monorepo",
    },
    links: [
      { kind: "docs", url: "https://matriz.example/docs", label: "Docs" },
      { kind: "app", url: "https://hub.matriz.example", label: "Hub" },
    ],
    healthBaseline: { readinessScore: 100, status: "healthy" },
    metrics: {
      customMetrics: [
        { key: "apps_registered", label: "Apps registrados", value: 5, unit: "count" },
        { key: "uptime", label: "Uptime", value: 99, unit: "percent" },
      ],
      lastActivityAt: new Date().toISOString(),
    },
  },
  spot: {
    projectId: "matriz:spot",
    brand: {
      brandName: "Spot",
      tagline: "Descoberta e reserva de espacos",
      primaryColor: "#0f766e",
      accentColor: "#14b8a6",
      logoText: "SP",
      tone: "product",
    },
    trustLevel: "core",
    institutionalTags: ["public", "booking"],
    ownership: { owner: "matriz-spot", contact: "spot@matriz.example" },
    links: [{ kind: "app", url: "https://spot.matriz.example", label: "Spot" }],
    healthBaseline: { readinessScore: 88, status: "healthy" },
    metrics: {
      activeUsers: 612,
      customMetrics: [
        { key: "listings", label: "Espacos listados", value: 128, unit: "count" },
        { key: "bookings_week", label: "Reservas/semana", value: 47, unit: "count" },
      ],
      lastActivityAt: new Date().toISOString(),
    },
  },
  seumei: {
    projectId: "matriz:seumei",
    brand: {
      brandName: "Seumei",
      tagline: "Gestao de estabelecimentos e operacao",
      primaryColor: "#7c2d12",
      accentColor: "#f97316",
      logoText: "SE",
      tone: "product",
    },
    trustLevel: "core",
    institutionalTags: ["public", "operations"],
    ownership: { owner: "matriz-seumei", contact: "seumei@matriz.example" },
    links: [{ kind: "app", url: "https://seumei.matriz.example", label: "Seumei" }],
    healthBaseline: { readinessScore: 84, status: "healthy" },
    metrics: {
      customMetrics: [
        { key: "establishments", label: "Estabelecimentos", value: 63, unit: "count" },
        { key: "contracts_month", label: "Contratos/mes", value: 21, unit: "count" },
      ],
      lastActivityAt: new Date().toISOString(),
    },
  },
  contracts: {
    projectId: "matriz:contracts",
    brand: {
      brandName: "Contracts",
      tagline: "Geracao e ciclo de vida de contratos",
      primaryColor: "#1e3a8a",
      accentColor: "#3b82f6",
      logoText: "CT",
      tone: "product",
    },
    trustLevel: "core",
    institutionalTags: ["internal", "legal-ops"],
    ownership: { owner: "matriz-contracts", contact: "contracts@matriz.example" },
    links: [],
    healthBaseline: { readinessScore: 90, status: "healthy" },
    metrics: {
      publishedItems: 312,
      customMetrics: [
        { key: "contracts_generated", label: "Contratos gerados", value: 312, unit: "count" },
      ],
      lastActivityAt: new Date().toISOString(),
    },
  },
  willdash: {
    projectId: "matriz:willdash",
    brand: {
      brandName: "Willdash",
      tagline: "Metas e objetivos pessoais",
      primaryColor: "#581c87",
      accentColor: "#a855f7",
      logoText: "WD",
      tone: "product",
    },
    trustLevel: "core",
    institutionalTags: ["public", "productivity"],
    ownership: { owner: "matriz-willdash", contact: "willdash@matriz.example" },
    links: [{ kind: "app", url: "https://willdash.matriz.example", label: "Willdash" }],
    healthBaseline: { readinessScore: 76, status: "degraded" },
    metrics: {
      activeUsers: 89,
      customMetrics: [
        { key: "goal_completion", label: "Conclusao de metas", value: 62, unit: "percent" },
      ],
      lastActivityAt: new Date().toISOString(),
    },
  },
}

/**
 * Retorna decoration institucional para um app interno. Fallback seguro caso
 * o appId nao esteja mapeado (evita quebrar ingestao de apps novos).
 */
export function decorationFor(manifest: AppManifestDTO): Decoration {
  const found = DECORATIONS[manifest.appId]
  if (found) return found
  return {
    projectId: `matriz:${manifest.appId.replace(/_/g, "-")}` as `matriz:${string}`,
    brand: {
      brandName: manifest.name,
      primaryColor: "#374151",
      accentColor: "#9ca3af",
      tone: "product",
    },
    trustLevel: "core",
    institutionalTags: [],
    ownership: { owner: "matriz" },
    links: [],
  }
}
