/**
 * Client-side gate. Renders children only when the auth status is
 * `signed-in`. Everything else routes to `fallback` (loading/unauth) and
 * `errorFallback` (hard error).
 *
 * Apps wrap their protected layouts with this component. The login UI
 * itself lives OUTSIDE this gate so it can render while signed-out.
 */
"use client"

import * as React from "react"
import { useAuth } from "../hooks/useAuth"

export interface AuthGateProps {
  readonly children: React.ReactNode
  readonly fallback?: React.ReactNode
  readonly loadingFallback?: React.ReactNode
  readonly errorFallback?: (error: { code: string; message: string }) => React.ReactNode
}

export function AuthGate({
  children,
  fallback = null,
  loadingFallback = null,
  errorFallback,
}: AuthGateProps) {
  const { status, error } = useAuth()
  if (status === "booting") return <>{loadingFallback}</>
  if (status === "signed-in" || status === "refreshing") return <>{children}</>
  if (status === "error" && error && errorFallback) return <>{errorFallback(error)}</>
  return <>{fallback}</>
}
