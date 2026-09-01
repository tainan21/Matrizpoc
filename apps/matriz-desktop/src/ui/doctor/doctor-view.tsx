import { useState } from "react"

import type { DoctorCheck } from "../../domain/types"
import { Icons } from "../icons"

export function DoctorView({
  checks,
  refresh,
}: {
  readonly checks: readonly DoctorCheck[]
  readonly refresh: () => Promise<unknown>
}) {
  const [busy, setBusy] = useState(false)
  const ready = checks.filter(({ ok }) => ok).length

  const run = async () => {
    if (busy) return
    setBusy(true)
    try {
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="doctor-view" aria-labelledby="doctor-title">
      <div className="section-head">
        <div>
          <span className="eyebrow">LOCAL / DIAGNÓSTICO OPERACIONAL</span>
          <h1 id="doctor-title">DOCTOR</h1>
          <p>Leitura independente do produto, sistema, toolchain e coworking local.</p>
        </div>
        <div className="doctor-summary">
          <strong>{ready}/{checks.length} prontos</strong>
          <button
            className="round-action"
            aria-label="Executar diagnóstico"
            disabled={busy}
            onClick={() => void run()}
          >
            <Icons.refresh />
          </button>
        </div>
      </div>

      <div className="check-list">
        {checks.map((check) => (
          <div className={`doctor-check doctor-check--${check.severity}`} key={check.id}>
            <span className={`status-dot ${check.ok ? "ready" : "degraded"}`} aria-hidden="true" />
            <div className="doctor-check-name">
              <small>{check.group}</small>
              <strong>{check.label}</strong>
            </div>
            <div className="doctor-check-detail">
              <strong>{check.value}</strong>
              <small>{check.description}</small>
            </div>
            <div className="doctor-check-policy">
              <small>ESPERADO</small>
              <span>{check.expected ?? "Disponível"}</span>
              {check.remedyId ? <em>Ação disponível após prévia segura</em> : null}
            </div>
          </div>
        ))}
        {!checks.length ? <p className="area-note">Executando diagnóstico…</p> : null}
      </div>
    </section>
  )
}
