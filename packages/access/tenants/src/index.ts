/**
 * @matriz/access-tenants
 *
 * Server-safe tenant types + mock seed.
 *
 * React context lives in `@matriz/access-tenants/client` so Server Components
 * can import `mockTenants` without evaluating React.createContext.
 */
import { asTenantId, type TenantId } from "@matriz/foundation-types"
import { MATRIZ_MOCK_TENANT_IDS } from "@matriz/foundation-constants"

export const ACCESS_TENANTS_VERSION = "0.1.0" as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Tenant {
  readonly id: TenantId
  readonly name: string
  readonly slug: string
  readonly enabledApps: readonly string[]
}

export const mockTenants: readonly Tenant[] = [
  {
    id: asTenantId(MATRIZ_MOCK_TENANT_IDS[0]),
    name: "Demo Studio",
    slug: "demo",
    enabledApps: ["matriz-hub", "spot", "seumei", "contracts", "willdash"],
  },
  {
    id: asTenantId(MATRIZ_MOCK_TENANT_IDS[1]),
    name: "Acme Collective",
    slug: "acme",
    enabledApps: ["matriz-hub", "spot", "contracts"],
  },
]

export const DEFAULT_TENANT: Tenant = mockTenants[0]!

export function findTenantById(id: TenantId | string): Tenant | undefined {
  return mockTenants.find((t) => t.id === id)
}
