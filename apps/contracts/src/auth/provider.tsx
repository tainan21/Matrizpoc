"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AuthGate, AuthProvider, useAuth } from "@matriz/platform-auth"
import { TenantProvider } from "@matriz/access-tenants"
import { contractsAuthConfig } from "./config"
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
        color: "var(--color-muted-foreground)",
        fontFamily: "Georgia, ui-serif, serif",
        fontSize: "0.9375rem",
      }}
    >
      Carregando Contratos…
    </div>
  )
}

function ContractsSessionBar() {
  const { session, signOut } = useAuth()
  if (!session) return null
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "0.75rem",
        padding: "0.5rem 2rem",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        fontFamily: "Georgia, ui-serif, serif",
        fontSize: "0.8125rem",
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
          padding: "0.25rem 0.75rem",
          borderRadius: "2px",
          color: "var(--color-foreground)",
          cursor: "pointer",
          fontSize: "0.75rem",
          fontFamily: "inherit",
        }}
      >
        Sair
      </button>
    </div>
  )
}

function ContractsAuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginRoute = (pathname ?? "").startsWith("/login")
  if (isLoginRoute) {
    return <LoginLayoutFrame>{children}</LoginLayoutFrame>
  }
  return (
    <AuthGate fallback={<RedirectToLogin />} loadingFallback={<BootingFallback />}>
      <ContractsSessionBar />
      {children}
    </AuthGate>
  )
}

export function ContractsAuthAdoption({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider config={contractsAuthConfig}>
      <TenantProvider>
        <ContractsAuthShell>{children}</ContractsAuthShell>
      </TenantProvider>
    </AuthProvider>
  )
}
