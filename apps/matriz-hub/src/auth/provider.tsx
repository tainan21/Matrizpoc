/**
 * Matriz Hub — auth adoption boundary.
 * Public, audit and immersive surfaces intentionally keep their own shells.
 */
"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AuthGate, AuthProvider, useAuth } from "@matriz/platform-auth/client"
import { TenantProvider } from "@matriz/access-tenants/client"
import { hubAuthConfig } from "./config"
import { HubShell } from "../ui/components/HubShell"

function RedirectToLogin(): null {
  const router = useRouter()
  React.useEffect(() => {
    router.replace("/login")
  }, [router])
  return null
}

function BootingFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted-fg)",
      }}
    >
      Carregando Hub…
    </div>
  )
}

function HubAuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ""
  const { session, signOut } = useAuth()
  const isLoginRoute = pathname.startsWith("/login")
  const isPublicRoute = pathname.startsWith("/public")
  const isAuditRoute = pathname.startsWith("/audit")
  const isImmersiveRoute = pathname.startsWith("/praticies")

  if (isLoginRoute || isPublicRoute) return <>{children}</>

  return (
    <AuthGate fallback={<RedirectToLogin />} loadingFallback={<BootingFallback />}>
      {isImmersiveRoute || isAuditRoute || !session ? (
        children
      ) : (
        <HubShell
          onSignOut={signOut}
          session={{
            userName: session.identity.user.name,
            email: session.identity.user.email,
          }}
        >
          {children}
        </HubShell>
      )}
    </AuthGate>
  )
}

export function HubAuthAdoption({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider config={hubAuthConfig}>
      <TenantProvider>
        <HubAuthShell>{children}</HubAuthShell>
      </TenantProvider>
    </AuthProvider>
  )
}
