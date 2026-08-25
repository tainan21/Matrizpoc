"use client"

import { useState } from "react"
import type { toFinanceEntryViewModel } from "./presenters/finance.presenter"

type View = ReturnType<typeof toFinanceEntryViewModel>

export function FinanceEntryDetail({ entry }: { readonly entry: View }) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  async function transition(action: "pay" | "cancel") {
    setPending(true); setMessage("")
    const response = await fetch(`/api/finance/entries/${entry.id}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: entry.version, note: null }) })
    const payload = await response.json(); setPending(false)
    if (!response.ok) { setMessage(response.status === 409 ? "O lançamento mudou. Atualize a página para continuar." : payload.message ?? "Não foi possível atualizar o lançamento."); return }
    window.location.reload()
  }
  return <main className="finance-page finance-detail">
    <header className="finance-hero"><div><a href="/workspace/finance" className="finance-back">← Voltar ao financeiro</a><span className="eyebrow">{entry.originLabel} · {entry.statusLabel}</span><h1>{entry.numberLabel}</h1><p>{entry.title}</p></div>{entry.canManage && <div className="finance-actions"><button disabled={pending} onClick={() => transition("pay")}>Marcar como pago</button><button className="secondary" disabled={pending} onClick={() => transition("cancel")}>Cancelar lançamento</button></div>}</header>
    <section className="finance-detail-grid"><article><span>Valor</span><strong data-kind={entry.kind}>{entry.kind === "EXPENSE" ? "−" : "+"}{entry.amount}</strong></article><article><span>Categoria</span><strong>{entry.categoryLabel}</strong></article><article><span>Competência</span><strong>{entry.competenceLabel}</strong></article><article><span>Vencimento</span><strong>{entry.dueLabel}</strong></article></section>
    {entry.description && <p className="finance-description">{entry.description}</p>}
    <p className="form-message" role="status">{message}</p>
    <section className="finance-events"><header><span className="eyebrow">AUDITORIA</span><h2>Histórico do lançamento</h2></header>{entry.events.map((event) => <article key={event.id}><span aria-hidden="true" /><div><strong>{event.typeLabel}</strong>{event.note && <p>{event.note}</p>}</div><time>{event.createdLabel}</time></article>)}</section>
  </main>
}
