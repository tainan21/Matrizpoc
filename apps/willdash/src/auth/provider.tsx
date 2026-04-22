"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AuthGate, AuthProvider, useAuth } from "@matriz/platform-auth"
import { TenantProvider } from "@matriz/access-tenants"
import { willdashAuthConfig } from "./config"
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
        display: "grid",
        placeItems: "center",
        fontFamily: "ui-monospace, monospace",
        fontSize: "0.75rem",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "var(--color-muted-foreground)",
      }}
    >
      booting willdash…
    </div>
  )
}

function WilldashSessionBar() {
  const { session, signOut } = useAuth()
  if (!session) return null
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.625rem 1.5rem",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        fontFamily: "ui-monospace, monospace",
        fontSize: "0.75rem",
        color: "var(--color-muted-foreground)",
      }}
    >
      <span style={{ letterSpacing: "0.15em", textTransform: "uppercase" }}>willdash · tenant #{session.activeTenantId}</span>
      <span style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span>
          <strong style={{ color: "var(--color-foreground)" }}>{session.identity.user.name}</strong>
        </span>
        <button
          type="button"
          onClick={signOut}
          style={{
            background: "transparent",
            border: "1px solid var(--color-border)",
            padding: "0.25rem 0.625rem",
            color: "var(--color-foreground)",
            fontFamily: "inherit",
            fontSize: "0.6875rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          logout
        </button>
      </span>
    </div>
  )
}

function WilldashAuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginRoute = (pathname ?? "").startsWith("/login")
  if (isLoginRoute) {
    return <LoginLayoutFrame>{children}</LoginLayoutFrame>
  }
  return (
    <AuthGate fallback={<RedirectToLogin />} loadingFallback={<BootingFallback />}>
      <WilldashSessionBar />
      {children}
    </AuthGate>
  )
}

export function WilldashAuthAdoption({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider config={willdashAuthConfig}>
      <TenantProvider>
        <WilldashAuthShell>{children}</WilldashAuthShell>
      </TenantProvider>
    </AuthProvider>
  )
}
