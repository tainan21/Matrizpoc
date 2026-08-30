"use client"

import { useEffect, useState } from "react"
import type { InfrastructureSnapshot } from "../../modules/infrastructure/domain/infrastructure"

export function InfrastructureRuntimeSummary() {
  const [snapshot, setSnapshot] = useState<InfrastructureSnapshot | null>(null)
  const [desktop, setDesktop] = useState(false)
  useEffect(() => { const bridge = window.matrizDesktop; setDesktop(Boolean(bridge)); if (bridge) void bridge.invoke({ type: "infrastructure.status" }).then((value) => setSnapshot(value as InfrastructureSnapshot)).catch(() => undefined) }, [])
  if (!desktop) return <section className="desktop-only-notice"><span>INFRAESTRUTURA · WEB READ-ONLY</span><p>Abra o Control Desktop para consultar e operar os serviços Windows.</p></section>
  const healthy = snapshot?.services.filter((service) => service.state === "healthy").length ?? 0
  return <section className="desktop-only-notice"><span>INFRAESTRUTURA MATRIZ</span><h2>{snapshot ? `${healthy} de ${snapshot.services.length} serviços saudáveis` : "Consultando serviços…"}</h2><p>Detalhes, lifecycle e logs ficam no cockpit Infrastructure.</p></section>
}
