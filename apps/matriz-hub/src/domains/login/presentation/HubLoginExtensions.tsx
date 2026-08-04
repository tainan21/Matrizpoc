"use client"

import { useEffect, useState } from "react"
import type { RecentAppAccess } from "@matriz/platform-auth"
import { useAuth } from "@matriz/platform-auth/client"
import { toHubLoginExtensionViewModel, type HubAvailabilityRow } from "./hub-login.presenter"

export function HubLoginStorySupplement() {
  const [rows, setRows] = useState<readonly HubAvailabilityRow[]>([])
  useEffect(() => {
    fetch("/api/ecosystem/health", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : [])
      .then((value: Omit<HubAvailabilityRow, "label">[]) => setRows(toHubLoginExtensionViewModel(value, []).availability))
      .catch(() => setRows([]))
  }, [])
  return (
    <div className="hub-login-story">
      <strong>Uma sessao · sete destinos</strong>
      <div className="hub-login-apps">
        {rows.map((row) => <span key={row.appId} data-status={row.status}><i />{row.label}<small>:{row.port}</small></span>)}
      </div>
    </div>
  )
}

export function HubLoginPanelSupplement() {
  const { broker, session } = useAuth()
  const [recent, setRecent] = useState<readonly RecentAppAccess[]>([])
  useEffect(() => {
    if (!broker || !session) { setRecent([]); return }
    broker.restoreSession().then((value) => setRecent(value?.recentApps ?? [])).catch(() => setRecent([]))
  }, [broker, session])
  if (!session) return <p className="hub-login-sso-note">A sessao criada aqui tambem abre Spot, Seumei, Contracts e WillDash.</p>
  const viewModel = toHubLoginExtensionViewModel([], recent)
  return viewModel.recentApps.length ? (
    <div className="hub-login-recents"><strong>Acessos recentes</strong>{viewModel.recentApps.map((item) => <span key={`${item.label}-${item.detail}`}>{item.label}<small>{item.detail}</small></span>)}</div>
  ) : null
}
