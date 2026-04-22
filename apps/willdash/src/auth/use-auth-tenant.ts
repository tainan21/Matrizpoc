"use client"

import { useAuth } from "@matriz/platform-auth"
import { useTenant } from "@matriz/access-tenants"
import {
  toWilldashSessionViewModel,
  type WilldashSessionViewModel,
} from "./session.mapper"

export interface WilldashAuthenticatedContext {
  readonly isSignedIn: boolean
  readonly tenantName: string
  readonly viewModel: WilldashSessionViewModel
}

export function useWilldashAuthTenant(): WilldashAuthenticatedContext {
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
        canViewTelemetry: false,
      },
    }
  }
  return {
    isSignedIn: true,
    tenantName: tenant.name,
    viewModel: toWilldashSessionViewModel(session),
  }
}
