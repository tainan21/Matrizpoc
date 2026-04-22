"use client"

import { useAuth } from "@matriz/platform-auth/client"
import { useTenant } from "@matriz/access-tenants/client"
import {
  toContractsSessionViewModel,
  type ContractsSessionViewModel,
} from "./session.mapper"

export interface ContractsAuthenticatedContext {
  readonly isSignedIn: boolean
  readonly tenantName: string
  readonly viewModel: ContractsSessionViewModel
}

export function useContractsAuthTenant(): ContractsAuthenticatedContext {
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
        canIssueContracts: false,
      },
    }
  }
  return {
    isSignedIn: true,
    tenantName: tenant.name,
    viewModel: toContractsSessionViewModel(session),
  }
}
