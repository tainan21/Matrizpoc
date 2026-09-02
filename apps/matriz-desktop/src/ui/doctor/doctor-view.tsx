import { useState } from "react"

import type { DoctorCheck, DoctorRemedyPreview, DoctorRemedyResult, DoctorRemedyTarget } from "../../domain/types"
import { Icons } from "../icons"

export function DoctorView({
  checks,
  refresh,
  previewRemedy,
  confirmRemedy,
  open,
}: {
  readonly checks: readonly DoctorCheck[]
  readonly refresh: () => Promise<unknown>
  readonly previewRemedy: (remedyId: string) => Promise<DoctorRemedyPreview>
  readonly confirmRemedy: (confirmationToken: string) => Promise<DoctorRemedyResult>
  readonly open: (target: DoctorRemedyTarget) => void
}) {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<DoctorRemedyPreview>()
  const [message, setMessage] = useState("")
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

  const review = async (remedyId: string) => {
    if (busy) return
    setBusy(true)
    setMessage("")
    try {
      setPreview(await previewRemedy(remedyId))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível preparar a correção.")
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!preview || busy) return
    setBusy(true)
    try {
      const result = await confirmRemedy(preview.confirmationToken)
      setPreview(undefined)
      setMessage("Correção encaminhada com segurança.")
      open(result.target)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A confirmação expirou.")
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
              {check.remedyId ? <button disabled={busy} aria-label={`Revisar correção de ${check.label}`} onClick={() => void review(check.remedyId!)}>REVISAR CORREÇÃO</button> : null}
            </div>
          </div>
        ))}
        {!checks.length ? <p className="area-note">Executando diagnóstico…</p> : null}
      </div>
      {message ? <p role="status">{message}</p> : null}
      {preview ? <div className="infra-confirm" role="dialog" aria-label="Confirmar correção do Doctor"><div><small>PRÉVIA OBRIGATÓRIA</small><h2>{preview.title}</h2><p>{preview.summary}</p></div><div><button disabled={busy} onClick={() => setPreview(undefined)}>CANCELAR</button><button disabled={busy} aria-label="Confirmar correção" onClick={() => void confirm()}>CONFIRMAR</button></div></div> : null}
    </section>
  )
}
