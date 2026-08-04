/**
 * Spot — Auth adoption component.
 *
 * Composes `@matriz/platform-auth` with `@matriz/access-tenants` and the
 * app's local shell. Behavior:
 *   - wraps children in `<AuthProvider>` + `<TenantProvider>`
 *   - if current path starts with `/login`, renders children inside
 *     `LoginLayoutFrame` without any shell (public surface)
 *   - otherwise renders `<AuthGate>` + `AppShell`; unsigned users are
 *     pushed to `/login`
 */
"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AuthGate, AuthProvider, useAuth } from "@matriz/platform-auth/client"
import { TenantProvider } from "@matriz/access-tenants/client"
import { Button } from "@matriz/design-ui"
import { spotAuthConfig } from "./config"
import { AppShell } from "../ui/components/AppShell"

function RedirectToLogin(): null {
  const router = useRouter()
  React.useEffect(() => {
    router.replace("/login")
  }, [router])
  return null
}

function BootingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-fg">
      Carregando Spot…
    </div>
  )
}

function SessionBar() {
  const { session, signOut } = useAuth()
  if (!session) return null
  return (
    <div className="flex items-center justify-end gap-3 border-b border-border bg-muted px-4 py-2 text-xs text-muted-fg">
      <span>
        <strong className="text-surface-fg">{session.identity.user.name}</strong>
        {" · "}
        {session.identity.user.email}
      </span>
      <Button variant="ghost" size="sm" onClick={signOut}>
        Sair
      </Button>
    </div>
  )
}

function SpotAuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginRoute = (pathname ?? "").startsWith("/login")
  if (isLoginRoute) {
    return <>{children}</>
  }
  return (
    <AuthGate fallback={<RedirectToLogin />} loadingFallback={<BootingFallback />}>
      <SessionBar />
      <AppShell>{children}</AppShell>
    </AuthGate>
  )
}

export function SpotAuthAdoption({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider config={spotAuthConfig}>
      <TenantProvider>
        <SpotAuthShell>{children}</SpotAuthShell>
      </TenantProvider>
    </AuthProvider>
  )
}
