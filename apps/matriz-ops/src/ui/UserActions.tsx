"use client"
import { useState } from "react"

export function UserActions({ userId, status, walletId }: { userId: string; status: string; walletId?: string }) {
  const [reason, setReason] = useState(""); const [confirmation, setConfirmation] = useState(""); const [amount, setAmount] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false)
  async function call(path: string, method: string, payload: Record<string, unknown>) {
    setBusy(true); setMessage("")
    try { const response = await fetch(path, { method, headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify(payload) }); const body = await response.json(); if (!response.ok) throw new Error(body.detail ?? body.error ?? "Falha operacional"); setMessage("Operação concluída e auditada."); window.location.reload() }
    catch (error) { setMessage(error instanceof Error ? error.message : "Falha operacional") } finally { setBusy(false) }
  }
  const context = { reason, confirmation, correlationId: crypto.randomUUID() }
  return <section className="panel action-panel"><h2>Ações protegidas</h2><p>Informe um motivo, digite CONFIRMAR e conclua o OTP de step-up nos últimos 5 minutos.</p><div className="form-row"><label>Motivo<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={8}/></label><label>Confirmação<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="CONFIRMAR"/></label></div><div className="button-row">
    {status === "ACTIVE" ? <button disabled={busy} onClick={() => call(`/api/v1/users/${userId}/suspend`, "POST", context)}>Suspender usuário</button> : status === "SUSPENDED" ? <button disabled={busy} onClick={() => call(`/api/v1/users/${userId}/restore`, "POST", context)}>Restaurar usuário</button> : null}
    {status !== "ANONYMIZED" && <button className="danger" disabled={busy} onClick={() => call(`/api/v1/users/${userId}/anonymize`, "POST", context)}>Anonimizar</button>}
  </div>{walletId && <div className="wallet-action"><h3>Ajuste MTRZ individual</h3><label>Quantidade em unidades MTRZ<input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}/></label><div className="button-row"><button disabled={busy || !amount} onClick={() => call(`/api/v1/wallets/${walletId}/mtrz-adjustments`, "POST", { ...context, amount: { currency: "MTRZ", amountMinor: amount }, direction: "CREDIT" })}>Aplicar crédito</button><button disabled={busy || !amount} onClick={() => call(`/api/v1/wallets/${walletId}/mtrz-adjustments`, "POST", { ...context, amount: { currency: "MTRZ", amountMinor: amount }, direction: "DEBIT" })}>Aplicar débito</button></div></div>}{message && <output className="action-result">{message}</output>}</section>
}
