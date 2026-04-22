/**
 * @matriz/access-tenants
 *
 * Tenant types + mock seed + minimal React context. Exposes both a plain
 * types surface (safe to import server-side) AND a `TenantProvider`
 * component (requires React at runtime; apps that use it must have React).
 */
import * as React from "react"
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

// ---------------------------------------------------------------------------
// React context (optional — only used by apps that import it)
// ---------------------------------------------------------------------------

export interface TenantContextValue {
  readonly tenant: Tenant
  readonly all: readonly Tenant[]
  setTenant(tenant: Tenant): void
}

const TenantContext = React.createContext<TenantContextValue | null>(null)

export interface TenantProviderProps {
  readonly children: React.ReactNode
  readonly initialTenant?: Tenant
}

export function TenantProvider({ children, initialTenant }: TenantProviderProps) {
  const [tenant, setTenant] = React.useState<Tenant>(initialTenant ?? DEFAULT_TENANT)
  const value = React.useMemo<TenantContextValue>(
    () => ({ tenant, all: mockTenants, setTenant }),
    [tenant],
  )
  return React.createElement(TenantContext.Provider, { value }, children)
}

export function useTenant(): TenantContextValue {
  const ctx = React.useContext(TenantContext)
  if (!ctx) {
    throw new Error(
      "[matriz/access-tenants] useTenant() must be used inside <TenantProvider>",
    )
  }
  return ctx
}
