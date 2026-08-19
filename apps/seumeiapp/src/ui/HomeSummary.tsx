"use client"

import { useEffect, useState } from "react"
import type { SeumeiHomeSummary } from "../application/read-home-summary"

export function HomeSummary() {
  const [summary, setSummary] = useState<SeumeiHomeSummary | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading")
  useEffect(() => {
    fetch("/api/home-summary", { cache: "no-store" })
      .then(async response => response.ok ? response.json() as Promise<SeumeiHomeSummary> : null)
      .then(value => { setSummary(value); setState(value ? "ready" : "empty") })
      .catch(() => setState("empty"))
  }, [])
  if (state === "loading") return <div className="signal">LENDO TENANT…</div>
  return <section className="summary" aria-live="polite">
    <div><span>TENANT</span><strong>{summary?.tenantName ?? "SEM CONTEXTO"}</strong></div>
    <div><span>EMPRESAS</span><strong>{String(summary?.establishmentCount ?? 0).padStart(2, "0")}</strong></div>
    <article>
      <span>EM FOCO</span>
      <strong>{summary?.firstEstablishment?.name ?? "PRONTA PARA CRIAR"}</strong>
      <small>{summary?.firstEstablishment ? `${summary.firstEstablishment.city} · ${summary.firstEstablishment.status}` : "A próxima etapa será o onboarding da empresa."}</small>
    </article>
  </section>
}
