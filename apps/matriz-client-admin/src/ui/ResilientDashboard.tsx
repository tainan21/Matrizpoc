"use client"
import { useEffect, useState } from "react"
import type { ClientAdminDashboard } from "@matriz/integration-api-contracts"
import { readCachedDashboard, writeCachedDashboard } from "../integration/dashboard-cache"
import { AppShell } from "./AppShell"
import { DashboardView } from "./DashboardView"

export function ResilientDashboard({ initial, section, path }: { initial: ClientAdminDashboard; section: "overview" | "systems" | "site" | "payments" | "integrations"; path: string }) {
  const [dashboard, setDashboard] = useState(initial)
  useEffect(() => {
    const activeTenantKey = "matriz-client-admin:active-tenant:v1"
    const previousTenant = localStorage.getItem(activeTenantKey)
    if (previousTenant && previousTenant !== initial.tenant.id) localStorage.removeItem(`matriz-client-admin:dashboard:v1:${previousTenant}`)
    localStorage.setItem(activeTenantKey, initial.tenant.id)
    const hasUsable = Object.values(initial.sections).some((value) => value.state === "fresh" || value.state === "empty" || value.state === "not_configured")
    if (hasUsable) writeCachedDashboard(localStorage, initial)
    else { const cached = readCachedDashboard(localStorage, initial.tenant.id); if (cached) setDashboard(cached) }
  }, [initial])
  return <AppShell productName={`Admin ${dashboard.tenant.name}`} activePath={path}><DashboardView dashboard={dashboard} section={section}/></AppShell>
}
