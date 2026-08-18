/**
 * @matriz/platform-config
 *
 * Shared runtime configuration constants AND feature flags (Law L10).
 *
 * Feature flags are a per-tenant, per-app, per-flag boolean map. They are
 * seeded statically for the POC but exposed via `isFeatureEnabled(...)` so
 * apps never read the shape directly. When real persistence arrives, only
 * the reader implementation needs to change.
 *
 * L12: flag NAMES live here, but they are capability descriptors — not
 * business logic.
 */
import type { MatrizAppId } from "@matriz/foundation-constants"

export const PLATFORM_CONFIG_VERSION = "0.1.0" as const

// ---------------------------------------------------------------------------
// Monorepo-level configuration
// ---------------------------------------------------------------------------

export interface MonorepoConfig {
  readonly version: string
  readonly ecosystem: "matriz"
  readonly environment: "development" | "preview" | "production"
  readonly baseUrls: Readonly<Record<MatrizAppId, string>>
}

export const monorepoConfig: MonorepoConfig = {
  version: "0.1.0",
  ecosystem: "matriz",
  environment:
    (typeof process !== "undefined" && process.env?.NODE_ENV === "production"
      ? "production"
      : "development"),
  baseUrls: {
    "matriz-hub": "http://localhost:3000",
    "matriz-desktop": "matriz://control",
    matrizlib: "http://localhost:3007",
    "matriz-workbench": "http://localhost:3005",
    sites: "http://localhost:3006",
    spot: "http://localhost:3001",
    seumei: "http://localhost:3002",
    contracts: "http://localhost:3003",
    willdash: "http://localhost:3004",
  },
}

// ---------------------------------------------------------------------------
// Feature flags (L10)
// ---------------------------------------------------------------------------

export type FeatureFlagName =
  | "spot.booking-v2"
  | "seumei.delivery-zones-preview"
  | "contracts.auto-link-on-create"
  | "contracts.pdf-export"
  | "willdash.rewards-v1"
  | "hub.telemetry-explorer"

export interface FeatureFlagRow {
  readonly flag: FeatureFlagName
  readonly appId: MatrizAppId
  readonly tenantId: string
  readonly enabled: boolean
  readonly description: string
}

/**
 * Seed mock — (tenantId -> appId -> flag -> row). Two tenants (demo, acme)
 * with intentionally different toggles so the Hub UI can show meaningful
 * differences per tenant.
 */
export const featureFlagSeed: readonly FeatureFlagRow[] = [
  // demo tenant — full experimental features on
  {
    flag: "spot.booking-v2",
    appId: "spot",
    tenantId: "tenant_demo",
    enabled: true,
    description: "Novo fluxo de booking de gigs com preview em tempo real.",
  },
  {
    flag: "seumei.delivery-zones-preview",
    appId: "seumei",
    tenantId: "tenant_demo",
    enabled: true,
    description: "Mapa experimental de zonas de entrega por estabelecimento.",
  },
  {
    flag: "contracts.auto-link-on-create",
    appId: "contracts",
    tenantId: "tenant_demo",
    enabled: true,
    description: "Auto-criar external link ao gerar contrato a partir de outro app.",
  },
  {
    flag: "contracts.pdf-export",
    appId: "contracts",
    tenantId: "tenant_demo",
    enabled: true,
    description: "Exportação mock em PDF (via platform-pdf).",
  },
  {
    flag: "willdash.rewards-v1",
    appId: "willdash",
    tenantId: "tenant_demo",
    enabled: true,
    description: "Motor inicial de recompensas por metas.",
  },
  {
    flag: "hub.telemetry-explorer",
    appId: "matriz-hub",
    tenantId: "tenant_demo",
    enabled: true,
    description: "Explorer de eventos de telemetria no Hub.",
  },

  // acme tenant — mostly off (demonstra comportamento diferente por tenant)
  {
    flag: "spot.booking-v2",
    appId: "spot",
    tenantId: "tenant_acme",
    enabled: false,
    description: "Desligado para Acme — cliente pediu fluxo clássico.",
  },
  {
    flag: "seumei.delivery-zones-preview",
    appId: "seumei",
    tenantId: "tenant_acme",
    enabled: false,
    description: "Desligado para Acme.",
  },
  {
    flag: "contracts.auto-link-on-create",
    appId: "contracts",
    tenantId: "tenant_acme",
    enabled: true,
    description: "Ligado para Acme — base da integração Spot↔Contracts.",
  },
  {
    flag: "contracts.pdf-export",
    appId: "contracts",
    tenantId: "tenant_acme",
    enabled: false,
    description: "Pendente para Acme.",
  },
  {
    flag: "willdash.rewards-v1",
    appId: "willdash",
    tenantId: "tenant_acme",
    enabled: false,
    description: "Acme não adotou WillDash ainda.",
  },
  {
    flag: "hub.telemetry-explorer",
    appId: "matriz-hub",
    tenantId: "tenant_acme",
    enabled: true,
    description: "Ligado para observabilidade compartilhada.",
  },
]

/** Read helper — single entry point apps should use. */
export function isFeatureEnabled(
  tenantId: string,
  appId: MatrizAppId,
  flag: FeatureFlagName,
  seed: readonly FeatureFlagRow[] = featureFlagSeed,
): boolean {
  const row = seed.find(
    (r) => r.tenantId === tenantId && r.appId === appId && r.flag === flag,
  )
  return row?.enabled ?? false
}

export function listFlagsForTenant(
  tenantId: string,
  seed: readonly FeatureFlagRow[] = featureFlagSeed,
): readonly FeatureFlagRow[] {
  return seed.filter((r) => r.tenantId === tenantId)
}

export function listFlagsForApp(
  appId: MatrizAppId,
  seed: readonly FeatureFlagRow[] = featureFlagSeed,
): readonly FeatureFlagRow[] {
  return seed.filter((r) => r.appId === appId)
}
