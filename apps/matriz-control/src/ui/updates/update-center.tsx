"use client"

import { useEffect, useState } from "react"
import type { DesktopUpdateSnapshot } from "../../domain/desktop-bridge"

type UpdateAction = "check" | "download" | "install"
const webSnapshot: DesktopUpdateSnapshot = { state: "unavailable", currentVersion: "web", availableVersion: null, progress: null, notes: null, message: "Atualizações estão disponíveis somente no aplicativo instalado." }

export function presentDesktopUpdate(snapshot: DesktopUpdateSnapshot): { action: UpdateAction | null; label: string } {
  if (snapshot.state === "idle" || snapshot.state === "current" || snapshot.state === "error") return { action: "check", label: "Verificar atualização" }
  if (snapshot.state === "available") return { action: "download", label: "Baixar atualização" }
  if (snapshot.state === "downloaded") return { action: "install", label: "Reiniciar e instalar" }
  return { action: null, label: snapshot.state === "checking" ? "Verificando…" : snapshot.state === "downloading" ? "Baixando…" : "Indisponível" }
}

export function UpdateCenter() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [snapshot, setSnapshot] = useState(webSnapshot)
  const bridge = typeof window === "undefined" ? undefined : window.matrizDesktop
  useEffect(() => bridge?.subscribe((event) => { if (event.type === "update.updated") setSnapshot(event.snapshot) }), [bridge])
  const show = () => { setOpen(true); if (bridge) void bridge.invoke({ type: "update.status" }).then((value) => setSnapshot(value as DesktopUpdateSnapshot)).catch(() => setSnapshot(webSnapshot)) }
  const act = async (action: UpdateAction) => {
    if (!bridge) return
    setBusy(true)
    try { setSnapshot(await bridge.invoke({ type: `update.${action}` } as Parameters<typeof bridge.invoke>[0]) as DesktopUpdateSnapshot) }
    catch (error) { setSnapshot((current) => ({ ...current, state: "error", message: error instanceof Error ? error.message : "Falha ao atualizar." })) }
    finally { setBusy(false) }
  }
  return <><button className="update-trigger" aria-label="Atualizar" aria-haspopup="dialog" onClick={show}>↻</button>{open ? <UpdateCenterView snapshot={snapshot} busy={busy} onAction={act} onClose={() => setOpen(false)} /> : null}</>
}

export function UpdateCenterView({ snapshot, busy, onAction, onClose }: { snapshot: DesktopUpdateSnapshot; busy: boolean; onAction(action: UpdateAction): void; onClose(): void }) {
  const presentation = presentDesktopUpdate(snapshot)
  return <div className="update-popover" role="dialog" aria-modal="false" aria-label="Atualizações do Matriz Control">
    <header><span><b>ATUALIZAÇÕES</b><small>Control {snapshot.currentVersion}</small></span><button aria-label="Fechar atualizações" onClick={onClose}>×</button></header>
    <p>{snapshot.message}</p>{snapshot.availableVersion ? <strong>Versão {snapshot.availableVersion}</strong> : null}
    {snapshot.progress !== null ? <div className="update-progress" aria-label={`Download ${snapshot.progress}%`}><i style={{ width: `${snapshot.progress}%` }} /><small>{snapshot.progress}%</small></div> : null}
    {snapshot.notes ? <div className="update-notes">{snapshot.notes}</div> : null}
    {presentation.action ? <button className="primary update-action" disabled={busy} onClick={() => onAction(presentation.action!)}>{presentation.label}</button> : null}
  </div>
}
