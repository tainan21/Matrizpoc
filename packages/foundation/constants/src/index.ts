/**
 * @matriz/foundation-constants
 *
 * Stable constants and enums usable across all packages and apps.
 * L12: must remain domain-free. No app-specific lists here.
 */

// ---------------------------------------------------------------------------
// Apps registered in the Matriz monorepo V1
// ---------------------------------------------------------------------------

export const MATRIZ_APP_IDS = [
  "matriz-hub",
  "spot",
  "seumei",
  "contracts",
  "willdash",
] as const

export type MatrizAppId = (typeof MATRIZ_APP_IDS)[number]

/** Human-facing names (used by UI/catalog; remains domain-free). */
export const MATRIZ_APP_NAMES: Readonly<Record<MatrizAppId, string>> = {
  "matriz-hub": "Matriz Hub",
  spot: "Spot",
  seumei: "Seu Mei",
  contracts: "Contracts",
  willdash: "WillDash",
}

// ---------------------------------------------------------------------------
// Contract versioning (L7)
// ---------------------------------------------------------------------------

export const CONTRACT_VERSION_V1 = "v1" as const
export type ContractVersion = typeof CONTRACT_VERSION_V1
export const CURRENT_CONTRACT_VERSION = CONTRACT_VERSION_V1

// ---------------------------------------------------------------------------
// Canonical event names (L3 — cross-app contract surface)
// Format: "<dominio>.<entidade>.<verbo>" (lowercase)
// ---------------------------------------------------------------------------

export const MATRIZ_EVENT_NAMES = [
  "onboarding.completed",
  "spot.gig.created",
  "seumei.establishment.selected",
  "contract.created",
  "contract.linked",
  "hub.app.opened",
  "willdash.goal.opened",
  "willdash.activity.logged",
] as const

export type MatrizEventName = (typeof MATRIZ_EVENT_NAMES)[number]

// ---------------------------------------------------------------------------
// Mock tenant IDs (POC bootstrap only — not business rule)
// ---------------------------------------------------------------------------

export const MATRIZ_MOCK_TENANT_IDS = ["tenant_demo", "tenant_acme"] as const
export type MatrizMockTenantId = (typeof MATRIZ_MOCK_TENANT_IDS)[number]

// ---------------------------------------------------------------------------
// Shared relation taxonomy for external-links (L3)
// ---------------------------------------------------------------------------

export const EXTERNAL_LINK_RELATION_TYPES = [
  "contract.source",
  "contract.reference",
  "contract.party",
  "tenant.ownership",
  "manifest.declared",
] as const

export type ExternalLinkRelationType =
  (typeof EXTERNAL_LINK_RELATION_TYPES)[number]
