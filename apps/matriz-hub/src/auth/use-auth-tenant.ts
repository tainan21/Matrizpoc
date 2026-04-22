"use client"

import { useAuth } from "@matriz/platform-auth/client"
import { useTenant } from "@matriz/access-tenants/client"
import {
  toHubSessionViewModel,
  type HubSessionViewModel,
} from "./session.mapper"

export interface HubAuthenticatedContext {
  readonly isSignedIn: boolean
  readonly tenantName: string
  readonly viewModel: HubSessionViewModel
}

export function useHubAuthTenant(): HubAuthenticatedContext {
  const { session } = useAuth()
  const { tenant } = useTenant()
  if (!session) {
    return {
      isSignedIn: false,
      tenantName: tenant.name,
      viewModel: {
        userName: "—",
        userEmail: "—",
        activeTenantName: tenant.name,
        activeTenantId: tenant.id,
        visibleApps: [],
      },
    }
  }
  return {
    isSignedIn: true,
    tenantName: tenant.name,
    viewModel: toHubSessionViewModel(session),
  }
}
