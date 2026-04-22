"use client"

/**
 * Client-only React surface for @matriz/access-tenants.
 */
import * as React from "react"
import { DEFAULT_TENANT, mockTenants, type Tenant } from "./index"

export interface TenantContextValue {
  readonly tenant: Tenant
  readonly all: readonly Tenant[]
  setTenant(tenant: Tenant): void
}

const TenantContext = React.createContext<TenantContextValue | null>(null)
TenantContext.displayName = "MatrizTenantContext"

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
