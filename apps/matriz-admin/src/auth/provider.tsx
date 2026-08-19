"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AuthGate, AuthProvider, useAuth } from "@matriz/platform-auth/client"
import { TenantProvider } from "@matriz/access-tenants/client"
import { seumeiAuthConfig } from "./config"
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

function SeumeiSessionBar() {
  const { session, signOut } = useAuth()
  if (!session) return null
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "0.75rem",
        padding: "0.5rem 1.5rem",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        fontSize: "0.75rem",
        color: "var(--color-muted-foreground)",
      }}
    >
      <span>
        <strong style={{ color: "var(--color-foreground)" }}>
          {session.identity.user.name}
        </strong>
        {" · "}
        {session.identity.user.email}
      </span>
      <button
        type="button"
        onClick={signOut}
        style={{
          border: "1px solid var(--color-border)",
          background: "transparent",
          color: "var(--color-foreground)",
          padding: "0.25rem 0.5rem",
          borderRadius: "0.375rem",
          fontSize: "0.75rem",
          cursor: "pointer",
        }}
      >
        Sair
      </button>
    </div>
  )
}

function SeumeiAuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginRoute = (pathname ?? "").startsWith("/login")
  if (isLoginRoute) {
    return <>{children}</>
  }
  return (
    <AuthGate fallback={<RedirectToLogin />} loadingFallback={<BootingFallback />}>
      <SeumeiSessionBar />
      <AppShell>{children}</AppShell>
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
