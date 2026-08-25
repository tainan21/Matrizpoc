"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@matriz/platform-auth/client"
import { useSeumeiTenant } from "../../domains/memberships/presentation/use-seumei-tenant"
import { SeumeiShell } from "../shell/SeumeiShell"
import { buildAppNavigation } from "../../domains/apps/application/app-navigation"

export function AppShell({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname() ?? "/hub"
  const { session, signOut } = useAuth()
  const tenant = useSeumeiTenant()
  const apps = tenant.current?.company.apps ?? []
  const activeApp = apps.find((app) => pathname.includes(`/apps/${app.id}`)) ?? null
  const navigation = activeApp
    ? buildAppNavigation(activeApp.id, activeApp.href)
    : apps.map((app) => ({ id: app.id, label: app.name, href: app.href, icon: app.icon }))

  return (
    <SeumeiShell
      user={{ name: session?.identity.user.name ?? "Conta", role: tenant.current?.company.roleLabel ?? "Membro", onSignOut: signOut }}
      company={tenant.current ? { name: tenant.current.company.name, logoUrl: tenant.current.company.logoUrl, accent: tenant.current.company.accent } : null}
      activeApp={activeApp}
      apps={apps}
      navigation={navigation}
    >
      {children}
    </SeumeiShell>
  )
}
