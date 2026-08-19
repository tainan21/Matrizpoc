"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { TenantProvider } from "@matriz/access-tenants/client"
import { AuthGate, AuthProvider, useAuth } from "@matriz/platform-auth/client"
import { bootstrapSeumei } from "../bootstrap"
import { seumeiAuthConfig } from "../auth/config"

function RedirectToLogin() {
  const router = useRouter()
  useEffect(() => router.replace("/login"), [router])
  return null
}

function SessionBar() {
  const { session, signOut } = useAuth()
  if (!session) return null
  return <div className="session-bar"><span>{session.identity.user.name}</span><button onClick={signOut}>Sair</button></div>
}

function Guard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  useEffect(() => { bootstrapSeumei() }, [])
  if (pathname?.startsWith("/login")) return children
  return <AuthGate fallback={<RedirectToLogin />} loadingFallback={<div className="boot">SEUMEI</div>}>
    <SessionBar />{children}
  </AuthGate>
}

export function SeumeiAuthShell({ children }: { children: ReactNode }) {
  return <AuthProvider config={seumeiAuthConfig}><TenantProvider><Guard>{children}</Guard></TenantProvider></AuthProvider>
}
