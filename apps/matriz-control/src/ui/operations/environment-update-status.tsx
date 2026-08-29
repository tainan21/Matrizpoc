"use client"

import { useEffect, useState } from "react"
import type { StoreAppSnapshot } from "../../domain/desktop-bridge"
import { presentEnvironmentUpdateStatus } from "./desktop-update-status-presenter"

type StoreRead = { state: "loading" | "failed" } | { state: "ready"; snapshots: readonly StoreAppSnapshot[] }

export function EnvironmentRuntimeStatus({ appId, actions }: { appId: string; actions: readonly string[] }) {
  const bridge = typeof window === "undefined" ? undefined : window.matrizDesktop
  const [read, setRead] = useState<StoreRead>({ state: "loading" })
  useEffect(() => {
    if (!bridge) return
    let active = true
    void bridge.invoke({ type: "store.apps.status" }).then((value) => { if (active) setRead({ state: "ready", snapshots: value as StoreAppSnapshot[] }) }).catch(() => { if (active) setRead({ state: "failed" }) })
    return () => { active = false }
  }, [bridge])
  const update = presentEnvironmentUpdateStatus(bridge ? { runtime: "desktop", appId, ...read } : { runtime: "web", appId })
  return <><code>{bridge ? "desktop" : "web"}</code><span><small>{actions.length ? actions.join(" · ") : "Sem ações declaradas"}</small><small>{update}</small></span></>
}
