"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AuthGate, AuthProvider } from "@matriz/platform-auth/client"
import { TenantProvider } from "@matriz/access-tenants/client"
import { seumeiAuthConfig } from "./config"
import { AppShell } from "../ui/components/AppShell"
import { SeumeiTenantProvider } from "../domains/memberships/presentation/SeumeiTenantProvider"

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
        color: "var(--color-muted-foreground)",
        fontSize: "0.875rem",
      }}
    >
      Carregando Seumei…
    </div>
  )
}

function SeumeiAuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginRoute = (pathname ?? "").startsWith("/login")
  const isPublicStoreRoute = (pathname ?? "").startsWith("/loja/")
  if (isLoginRoute || isPublicStoreRoute) {
    return <>{children}</>
  }
  return (
    <AuthGate fallback={<RedirectToLogin />} loadingFallback={<BootingFallback />}>
      <SeumeiTenantProvider>
        <AppShell>{children}</AppShell>
      </SeumeiTenantProvider>
    </AuthGate>
  )
}

export function SeumeiAuthAdoption({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider config={seumeiAuthConfig}>
      <TenantProvider>
        <SeumeiAuthShell>{children}</SeumeiAuthShell>
      </TenantProvider>
    </AuthProvider>
  )
}
