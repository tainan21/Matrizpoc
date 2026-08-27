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

export interface LocalAppRuntimeConfig {
  readonly slug: string
  readonly appId: MatrizAppId
  readonly directory: `apps/${string}`
  readonly preferredPort: number
  readonly host: "127.0.0.1"
  readonly healthPath: `/${string}`
  readonly lifecycle: "active" | "migrating" | "experimental" | "retired"
  readonly runtimeAdapter: "next"
}

export const localAppRuntimes: readonly LocalAppRuntimeConfig[] = [
  { slug: "hub", appId: "matriz-hub", directory: "apps/matriz-hub", preferredPort: 3000, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "active", runtimeAdapter: "next" },
  { slug: "spot", appId: "spot", directory: "apps/spot", preferredPort: 3001, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "active", runtimeAdapter: "next" },
  { slug: "admin", appId: "matriz-admin", directory: "apps/matriz-admin", preferredPort: 3002, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "active", runtimeAdapter: "next" },
  { slug: "contracts", appId: "contracts", directory: "apps/contracts", preferredPort: 3003, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "active", runtimeAdapter: "next" },
  { slug: "willdash", appId: "willdash", directory: "apps/willdash", preferredPort: 3004, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "active", runtimeAdapter: "next" },
  { slug: "workbench", appId: "matriz-workbench", directory: "apps/matriz-workbench", preferredPort: 3005, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "active", runtimeAdapter: "next" },
  { slug: "sites", appId: "sites", directory: "apps/sites", preferredPort: 3006, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "active", runtimeAdapter: "next" },
  { slug: "matrizlib", appId: "matrizlib", directory: "apps/matrizlib", preferredPort: 3007, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "active", runtimeAdapter: "next" },
  { slug: "seumei", appId: "seumei", directory: "apps/seumeiapp", preferredPort: 3008, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "active", runtimeAdapter: "next" },
  { slug: "control", appId: "matriz-control", directory: "apps/matriz-control", preferredPort: 3009, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "experimental", runtimeAdapter: "next" },
  { slug: "health", appId: "health", directory: "apps/health", preferredPort: 3010, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "experimental", runtimeAdapter: "next" },
] as const

const preferredBaseUrls = Object.fromEntries(
  localAppRuntimes.map((app) => [app.appId, `http://${app.host}:${app.preferredPort}`]),
) as Partial<Record<MatrizAppId, string>>

export const monorepoConfig: MonorepoConfig = {
  version: "0.1.0",
  ecosystem: "matriz",
  environment:
    (typeof process !== "undefined" && process.env?.NODE_ENV === "production"
      ? "production"
      : "development"),
  baseUrls: {
    "matriz-identity": "http://127.0.0.1:8080",
    "matriz-desktop": "matriz://control",
    ...preferredBaseUrls,
  } as Readonly<Record<MatrizAppId, string>>,
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
