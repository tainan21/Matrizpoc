"use client"

import { useEffect, useState } from "react"
import type { WorkbenchRuntimeSnapshot, WorkbenchRuntimeStatus } from "../domain/workbench-runtime"

const initial: WorkbenchRuntimeSnapshot = {
  status: "stopped",
  pid: null,
  error: null,
  updatedAt: new Date(0).toISOString(),
}

export function presentWorkbenchRuntime(status: WorkbenchRuntimeStatus) {
  if (status === "ready") return { label: "Disponível", canOpen: true, canRestart: true }
  if (status === "starting") return { label: "Iniciando", canOpen: false, canRestart: false }
  if (status === "failed") return { label: "Falhou", canOpen: true, canRestart: true }
  if (status === "incompatible") return { label: "Versão incompatível", canOpen: false, canRestart: true }
  return { label: "Parado", canOpen: true, canRestart: false }
}

export function WorkbenchRuntimeCard({ onError }: { onError(message: string): void }) {
  const [snapshot, setSnapshot] = useState(initial)
  const [pending, setPending] = useState(false)
  const bridge = typeof window === "undefined" ? undefined : window.matrizDesktop
  const view = presentWorkbenchRuntime(snapshot.status)

  useEffect(() => {
    if (!bridge) return
    void bridge.invoke({ type: "workbench.status" }).then((value) => setSnapshot(value as WorkbenchRuntimeSnapshot))
    return bridge.subscribe((event) => {
      if (event.type === "workbench.updated") setSnapshot(event.snapshot)
    })
  }, [bridge])

  async function invoke(type: "workbench.open" | "workbench.restart") {
    if (!bridge) return onError("O Workbench instalado está disponível somente no app desktop.")
    setPending(true)
    try { setSnapshot(await bridge.invoke({ type }) as WorkbenchRuntimeSnapshot) }
    catch { onError("Não foi possível iniciar o Workbench local.") }
    finally { setPending(false) }
  }

  return <>
    <header className="app-heading"><div><i className={`status-dot ${snapshot.status === "ready" ? "running" : snapshot.status}`} /><span><strong>Matriz Workbench</strong><small>APP LOCAL · 127.0.0.1:3005</small></span></div><span className="native-badge">INSTALADO</span></header>
    <div className="app-tabs"><button className="active">VISÃO GERAL</button><button>DIAGNÓSTICOS</button><button>REPAROS</button></div>
    <div className="quick-actions"><small>AÇÕES DO APP</small><div><button className="primary" disabled={pending || !view.canOpen || !bridge} onClick={() => void invoke("workbench.open")}>{pending ? "Iniciando…" : "Abrir Workbench"}</button><button disabled={pending || !view.canRestart || !bridge} onClick={() => void invoke("workbench.restart")}>Reiniciar</button></div></div>
    <div className="terminal-callout workbench-runtime"><strong aria-hidden="true">WB</strong><h2>{view.label}</h2><p>{snapshot.status === "ready" ? "Diagnósticos locais e reparos Codex estão conectados ao Control." : snapshot.error ?? "O runtime será iniciado ao abrir."}</p><button disabled={pending || !view.canOpen || !bridge} onClick={() => void invoke("workbench.open")}>Abrir Workbench</button></div>
  </>
}
