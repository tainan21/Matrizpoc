/**
 * Shared React context. Kept in its own module (no JSX) so the hooks can
 * import it without pulling the provider component.
 */
"use client"

import * as React from "react"
import type { AuthError, AuthSession, AuthStatus } from "../types"
import type { SignInStrategy } from "../strategies/strategy.types"

export interface AuthContextValue {
  readonly status: AuthStatus
  readonly session: AuthSession | null
  readonly error: AuthError | null
  readonly strategies: readonly SignInStrategy[]
  readonly defaultStrategyId: string
  start<TIn, TOut>(strategyId: string, input: TIn): Promise<TOut | null>
  verify(strategyId: string, input: unknown): Promise<AuthSession | null>
  signOut(): void
  refresh(): void
  setActiveTenant(tenantId: string): void
}

export const AuthContext = React.createContext<AuthContextValue | null>(null)
AuthContext.displayName = "MatrizAuthContext"
