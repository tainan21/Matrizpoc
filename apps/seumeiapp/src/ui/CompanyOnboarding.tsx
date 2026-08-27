"use client"

import { useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button, FormField, Input } from "@matriz/design-ui"
import type { CompanyOperationType } from "../domain/company"
import type { OnboardingViewModel } from "./presenters/company.presenter"

const STEP_NUMBER = { IDENTITY: 1, OPERATION: 2, PREFERENCES: 3, REVIEW: 4, COMPLETED: 4 } as const
const OPERATIONS: readonly [CompanyOperationType, string][] = [["PHYSICAL_STORE", "Loja física"], ["ONLINE_STORE", "Loja online"], ["SERVICE", "Serviços"], ["HYBRID", "Operação híbrida"]]

export function CompanyOnboarding({ onboarding }: { readonly onboarding: OnboardingViewModel }) {
  const router = useRouter()
  const firstOperation = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("")
    const form = new FormData(event.currentTarget)
    let values: Record<string, unknown> = {}
    if (onboarding.currentStep === "IDENTITY") values = { name: form.get("name"), slug: form.get("slug") }
    if (onboarding.currentStep === "OPERATION") {
      const operationType = form.get("operationType")
      if (!operationType) { setError("Escolha como a empresa opera."); firstOperation.current?.focus(); return }
      if (!String(form.get("city") ?? "").trim()) { setError("Informe a cidade da operação."); document.getElementById("operation-city")?.focus(); return }
      values = { operationType, city: form.get("city"), country: form.get("country") }
    }
    if (onboarding.currentStep === "PREFERENCES") values = { currency: form.get("currency") }
    setPending(true)
    try {
      const completing = onboarding.currentStep === "REVIEW"
      const response = await fetch("/api/onboarding", { method: completing ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(completing ? { expectedVersion: onboarding.version } : { expectedVersion: onboarding.version, step: onboarding.currentStep, values }) })
      const payload = await response.json() as { error?: string }
      if (response.status === 409 && payload.error === "onboarding_conflict") { setError("O progresso mudou em outra sessão."); return }
      if (!response.ok) throw new Error("Não foi possível salvar esta etapa.")
      if (completing) router.push("/workspace")
      else router.refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar esta etapa.") }
    finally { setPending(false) }
  }

  return <main className="onboarding-page">
    <aside className="onboarding-context"><a href="/" className="brand-lockup"><span className="brand-mark">S</span><strong>SEUMEI</strong></a><div><span className="eyebrow">CONFIGURANDO</span><h1>{onboarding.companyName}</h1><p>O progresso é salvo a cada etapa e continua disponível após sair.</p></div><div className="progress-track" aria-label={`${onboarding.progressPercent}% concluído`}><span style={{ width: `${onboarding.progressPercent}%` }} /></div></aside>
    <section className="onboarding-task"><header><span className="step-count">Etapa {STEP_NUMBER[onboarding.currentStep]} de 4 · {onboarding.currentStepLabel}</span><h2>{onboarding.currentStep === "IDENTITY" ? "Como a empresa se apresenta?" : onboarding.currentStep === "OPERATION" ? "Como a empresa opera?" : onboarding.currentStep === "PREFERENCES" ? "Qual é a moeda principal?" : "Revise antes de entrar."}</h2></header>
      <form onSubmit={submit} noValidate>
        {onboarding.currentStep === "IDENTITY" ? <><FormField id="identity-name" label="Nome da empresa"><Input name="name" defaultValue={onboarding.companyName} required /></FormField><FormField id="identity-slug" label="Endereço"><Input name="slug" defaultValue={onboarding.companySlug} required /></FormField></> : null}
        {onboarding.currentStep === "OPERATION" ? <><fieldset className="operation-options"><legend>Tipo de operação</legend>{OPERATIONS.map(([value, label], index) => <label key={value}><input ref={index === 0 ? firstOperation : undefined} type="radio" name="operationType" value={value} defaultChecked={onboarding.operationType === value} /><span>{label}</span></label>)}</fieldset><div className="field-row"><FormField id="operation-city" label="Cidade"><Input name="city" defaultValue={onboarding.city} /></FormField><FormField id="operation-country" label="País"><Input name="country" defaultValue={onboarding.country} maxLength={2} /></FormField></div></> : null}
        {onboarding.currentStep === "PREFERENCES" ? <FormField id="preference-currency" label="Moeda"><select id="preference-currency" name="currency" defaultValue={onboarding.currency}><option value="BRL">Real brasileiro · BRL</option><option value="USD">Dólar · USD</option><option value="EUR">Euro · EUR</option></select></FormField> : null}
        {onboarding.currentStep === "REVIEW" ? <dl className="review-list"><div><dt>Empresa</dt><dd>{onboarding.companyName}</dd></div><div><dt>Operação</dt><dd>{OPERATIONS.find(([value]) => value === onboarding.operationType)?.[1]}</dd></div><div><dt>Local</dt><dd>{onboarding.city} · {onboarding.country}</dd></div><div><dt>Moeda</dt><dd>{onboarding.currency}</dd></div></dl> : null}
        <div className="form-actions"><Button type="submit" size="lg" disabled={pending}>{pending ? "Salvando…" : onboarding.currentStep === "REVIEW" ? "Concluir configuração" : "Salvar e continuar"}</Button>{error === "O progresso mudou em outra sessão." ? <Button variant="secondary" onClick={() => router.refresh()}>Recarregar progresso</Button> : null}</div>
        <p className="form-message" role="status" aria-live="polite">{error}</p>
      </form>
    </section>
  </main>
}
