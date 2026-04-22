"use client"

import { useAuth } from "@matriz/platform-auth/client"
import { useTenant } from "@matriz/access-tenants/client"
import {
  toSeumeiSessionViewModel,
  type SeumeiSessionViewModel,
} from "./session.mapper"

export interface SeumeiAuthenticatedContext {
  readonly isSignedIn: boolean
  readonly tenantName: string
  readonly viewModel: SeumeiSessionViewModel
}

export function useSeumeiAuthTenant(): SeumeiAuthenticatedContext {
  const { session } = useAuth()
  const { tenant } = useTenant()
  if (!session) {
    return {
      isSignedIn: false,
      tenantName: tenant.name,
      viewModel: {
        userName: "—",
        userEmail: "—",
        activeTenantId: tenant.id,
        activeTenantName: tenant.name,
        canEditOperation: false,
      },
    }
  }
  return {
    isSignedIn: true,
    tenantName: tenant.name,
    viewModel: toSeumeiSessionViewModel(session),
  }
}
