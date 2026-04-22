/**
 * `<AuthProvider>` — the React-facing heart of the auth package.
 *
 * Responsibilities:
 *   - boot: restore any persisted session on mount
 *   - orchestrate strategy start/verify calls and commit their result
 *   - expose the finite `AuthStatus` to consumers
 *   - persist/clear sessions via the injected `SessionStorage`
 *
 * This component owns NO domain. All app-specific flavor (strategy choice,
 * branding, tenant resolution) happens in `apps/<app>/src/auth/`.
 */
"use client"

import * as React from "react"
import { asTenantId } from "@matriz/foundation-types"
import type { AuthProviderConfig } from "../contracts"
import {
  clearSession,
  createSession,
  persistSession,
  refreshSession,
  restoreSession,
} from "../services/session.service"
import {
  createAppSessionStorage,
  type SessionStorage,
} from "../storage/session.storage"
import type { AuthError, AuthSession, AuthStatus } from "../types"
import type { SignInStrategy } from "../strategies/strategy.types"
import { AuthContext, type AuthContextValue } from "./auth.context"

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24h

export interface AuthProviderProps {
  readonly config: AuthProviderConfig
  readonly children: React.ReactNode
}

type InternalState =
  | { readonly status: "booting"; readonly session: null; readonly error: null }
  | { readonly status: "signed-out"; readonly session: null; readonly error: AuthError | null }
  | { readonly status: "signing-in"; readonly session: null; readonly error: null }
  | { readonly status: "signed-in"; readonly session: AuthSession; readonly error: null }
  | { readonly status: "refreshing"; readonly session: AuthSession; readonly error: null }
  | { readonly status: "error"; readonly session: AuthSession | null; readonly error: AuthError }

export function AuthProvider({ config, children }: AuthProviderProps) {
  const storage = React.useMemo<SessionStorage>(
    () => config.storage ?? createAppSessionStorage(config.appId),
    [config.storage, config.appId],
  )
  const sessionTtlMs = config.sessionTtlMs ?? DEFAULT_TTL_MS
  const now = React.useCallback(() => (config.now ? config.now() : new Date()), [config])

  const strategies = config.strategies
  const defaultStrategyId = strategies[0]?.id ?? "otp"

  const [state, setState] = React.useState<InternalState>({
    status: "booting",
    session: null,
    error: null,
  })

  // --- boot: restore from storage ------------------------------------
  React.useEffect(() => {
    const restored = restoreSession(storage, now())
    if (restored.ok) {
      setState({ status: "signed-in", session: restored.value, error: null })
    } else {
      setState({ status: "signed-out", session: null, error: null })
    }
    // run once per storage instance (appId is part of the storage namespace)
  }, [storage])

  // --- strategy lookup -----------------------------------------------
  const findStrategy = React.useCallback(
    (id: string): SignInStrategy | undefined => strategies.find((s) => s.id === id),
    [strategies],
  )

  // --- start ----------------------------------------------------------
  const start = React.useCallback(
    async <TIn, TOut>(strategyId: string, input: TIn): Promise<TOut | null> => {
      const strategy = findStrategy(strategyId)
      if (!strategy) {
        setState((prev) => ({
          status: "error",
          session: prev.session,
          error: {
            code: "strategy-unavailable",
            message: `Estrategia "${strategyId}" nao esta configurada.`,
          },
        }))
        return null
      }
      setState({ status: "signing-in", session: null, error: null })
      const result = await strategy.start(input as never)
      if (!result.ok) {
        setState({ status: "error", session: null, error: result.error })
        return null
      }
      // Challenge emitted (OTP sent / magic link created). The user now
      // has to complete the challenge via `verify`, so we go back to an
      // idle state. The local UI tracks the "awaiting-challenge" phase.
      setState({ status: "signed-out", session: null, error: null })
      return result.value as TOut
    },
    [findStrategy],
  )

  // --- verify ---------------------------------------------------------
  const verify = React.useCallback(
    async (strategyId: string, input: unknown): Promise<AuthSession | null> => {
      const strategy = findStrategy(strategyId)
      if (!strategy) {
        setState({
          status: "error",
          session: null,
          error: {
            code: "strategy-unavailable",
            message: `Estrategia "${strategyId}" nao esta configurada.`,
          },
        })
        return null
      }
      setState({ status: "signing-in", session: null, error: null })
      const result = await strategy.verify(input as never)
      if (!result.ok) {
        setState({ status: "error", session: null, error: result.error })
        return null
      }
      const session = createSession({
        identity: result.value,
        strategyId,
        sessionTtlMs,
        now: now(),
      })
      persistSession(storage, session)
      setState({ status: "signed-in", session, error: null })
      return session
    },
    [findStrategy, now, sessionTtlMs, storage],
  )

  // --- signOut --------------------------------------------------------
  const signOut = React.useCallback(() => {
    clearSession(storage)
    setState({ status: "signed-out", session: null, error: null })
  }, [storage])

  // --- refresh --------------------------------------------------------
  const refresh = React.useCallback(() => {
    setState((prev) => {
      if (prev.status !== "signed-in") return prev
      const refreshed = refreshSession(prev.session, now(), sessionTtlMs)
      persistSession(storage, refreshed)
      return { status: "signed-in", session: refreshed, error: null }
    })
  }, [now, sessionTtlMs, storage])

  // --- tenant switch --------------------------------------------------
  const setActiveTenant = React.useCallback(
    (tenantId: string) => {
      setState((prev) => {
        if (prev.status !== "signed-in") return prev
        const match = prev.session.identity.tenants.find((t) => t.tenantId === tenantId)
        if (!match) return prev
        const next: AuthSession = {
          ...prev.session,
          activeTenantId: asTenantId(tenantId),
        }
        persistSession(storage, next)
        return { status: "signed-in", session: next, error: null }
      })
    },
    [storage],
  )

  // --- context value --------------------------------------------------
  const value = React.useMemo<AuthContextValue>(
    () => ({
      status: state.status as AuthStatus,
      session: state.session,
      error: state.error,
      strategies,
      defaultStrategyId,
      start,
      verify,
      signOut,
      refresh,
      setActiveTenant,
    }),
    [state, strategies, defaultStrategyId, start, verify, signOut, refresh, setActiveTenant],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
