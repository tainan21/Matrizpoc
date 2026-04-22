/**
 * Composes `useAuth` (identity + session) with `useTenant` (active tenant
 * context). Lives in the app, not in a package (L12 — no cross-app
 * business rule about what counts as "authenticated tenant").
 */
"use client"

import { useAuth } from "@matriz/platform-auth"
import { useTenant } from "@matriz/access-tenants"
import {
  toSpotSessionViewModel,
  type SpotSessionViewModel,
} from "./session.mapper"

export interface SpotAuthenticatedContext {
  readonly viewModel: SpotSessionViewModel
  readonly activeTenantName: string
  readonly isSignedIn: boolean
}

export function useSpotAuthTenant(): SpotAuthenticatedContext {
  const { session } = useAuth()
  const { tenant } = useTenant()
  if (!session) {
    return {
      isSignedIn: false,
      activeTenantName: tenant.name,
      viewModel: {
        userName: "—",
        userEmail: "—",
        activeTenantName: tenant.name,
        activeTenantId: tenant.id,
        canCreateGigs: false,
        canRequestContracts: false,
      },
    }
  }
  return {
    isSignedIn: true,
    activeTenantName: tenant.name,
    viewModel: toSpotSessionViewModel(session),
  }
}
