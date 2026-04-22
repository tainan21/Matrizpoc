/**
 * Matriz Hub — Auth adoption component. Same structural pattern as the
 * other apps, different visual skin and strategy (magic link).
 */
"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AuthGate, AuthProvider, useAuth } from "@matriz/platform-auth/client"
import { TenantProvider } from "@matriz/access-tenants/client"
import { hubAuthConfig } from "./config"
import { HubShell } from "../ui/components/HubShell"
import { LoginLayoutFrame } from "../domains/login/presentation/LoginLayoutFrame"

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

function HubSessionBar() {
  const { session, signOut } = useAuth()
  if (!session) return null
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "0.75rem",
        padding: "0.5rem 1rem",
        fontSize: "0.75rem",
        borderBottom: "1px solid var(--border)",
        background: "var(--muted)",
        color: "var(--muted-fg)",
      }}
    >
      <span>
        <strong style={{ color: "var(--surface-fg)" }}>
          {session.identity.user.name}
        </strong>
        {" · "}
        {session.identity.user.email}
      </span>
      <button
        type="button"
        onClick={signOut}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "0.375rem",
          padding: "0.25rem 0.5rem",
          color: "var(--surface-fg)",
          cursor: "pointer",
          fontSize: "0.75rem",
        }}
      >
        Sair
      </button>
    </div>
  )
}

function HubAuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginRoute = (pathname ?? "").startsWith("/login")
  if (isLoginRoute) {
    return <LoginLayoutFrame>{children}</LoginLayoutFrame>
  }
  return (
    <AuthGate fallback={<RedirectToLogin />} loadingFallback={<BootingFallback />}>
      <HubSessionBar />
      <HubShell>{children}</HubShell>
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
