"use client"

import { useEffect, useState } from "react"
import type { Capsule } from "../../domain/browser"
import { presentDesktopSurface } from "./desktop-surface-presenter"

export function AgentsPanel() {
  const bridge = typeof window === "undefined" ? undefined : window.matrizDesktop
  const [capsules, setCapsules] = useState<readonly Capsule[]>([])
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!bridge) return
    let active = true
    void bridge.invoke({ type: "capsule.list" }).then((value) => { if (active) setCapsules(value as Capsule[]) }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [bridge])
  const surface = presentDesktopSurface(bridge ? "desktop" : "web", "A gestão de cápsulas")
  if (!surface.available) return <section className="desktop-only-notice"><span>DESKTOP NECESSÁRIO</span><h2>Agentes não recebem privilégios no navegador.</h2><p>{surface.message} Abra esta mesma rota no Control instalado para observar as cápsulas e suas políticas locais.</p></section>
  if (failed) return <section className="desktop-only-notice"><span>BRIDGE INDISPONÍVEL</span><h2>Não foi possível consultar as cápsulas.</h2><p>O painel não cria, delega ou eleva autoridade. Tente novamente após reiniciar o desktop.</p></section>
  return <section className="operation-table" aria-label="Cápsulas locais">{capsules.length ? capsules.map((capsule) => <article key={capsule.id}><span><b>{capsule.name}</b><small>{capsule.kind === "human" ? "Pessoa" : "Agente"} · canal local isolado</small></span><code>{capsule.policy}</code><small>{capsule.cacheMode === "persistent" ? "sessão persistente" : "somente memória"}</small></article>) : <p className="muted">Nenhuma cápsula local registrada nesta instalação.</p>}</section>
}
