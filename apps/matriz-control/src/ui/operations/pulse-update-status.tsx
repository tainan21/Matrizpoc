"use client"

import { useEffect, useState } from "react"
import type { DesktopUpdateSnapshot } from "../../domain/desktop-bridge"
import { presentPulseUpdateStatus } from "./desktop-update-status-presenter"

type UpdateRead = { state: "loading" | "failed" } | { state: "ready"; snapshot: DesktopUpdateSnapshot }

export function PulseUpdateStatus() {
  const bridge = typeof window === "undefined" ? undefined : window.matrizDesktop
  const [read, setRead] = useState<UpdateRead>({ state: "loading" })
  useEffect(() => {
    if (!bridge) return
    let active = true
    void bridge.invoke({ type: "update.status" }).then((value) => { if (active) setRead({ state: "ready", snapshot: value as DesktopUpdateSnapshot }) }).catch(() => { if (active) setRead({ state: "failed" }) })
    return () => { active = false }
  }, [bridge])
  const status = presentPulseUpdateStatus(bridge ? { runtime: "desktop", ...read } : { runtime: "web" })
  return <article className="operation-card"><span>ATUALIZAÇÃO DO CONTROL</span><strong>{status.headline}</strong><p>{status.detail}</p></article>
}
