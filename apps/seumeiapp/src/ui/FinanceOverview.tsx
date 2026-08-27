"use client"

import Link from "next/link"
import { useRef, useState, type FormEvent } from "react"
import type { toFinanceOverviewViewModel } from "./presenters/finance.presenter"

type View = ReturnType<typeof toFinanceOverviewViewModel>

export function FinanceOverview({ view, month, today }: { readonly view: View; readonly month: string; readonly today: string }) {
  const defaultDate = today.startsWith(`${month}-`) ? today : `${month}-01`
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const idempotencyKey = useRef("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setMessage("")
    const data = new FormData(event.currentTarget)
    const response = await fetch("/api/finance/entries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"), description: data.get("description") || null,
        kind: data.get("kind"), category: data.get("category"), amount: data.get("amount"),
        competenceDate: data.get("competenceDate"), dueDate: data.get("dueDate"),
        paid: data.get("paid") === "on", idempotencyKey: idempotencyKey.current ||= crypto.randomUUID(),
      }),
    })
    const payload = await response.json()
    setPending(false)
    if (!response.ok) { setMessage(payload.message ?? (response.status === 409 ? "Esse lançamento já foi registrado." : "Não foi possível salvar o lançamento.")); return }
    window.location.href = `/workspace/finance/entries/${payload.entry.id}`
  }

  return <main className="finance-page">
    <header className="finance-hero"><div><span className="eyebrow">LIVRO OPERACIONAL</span><h1>Financeiro</h1><p>Receitas de pedidos e lançamentos manuais, com origem e histórico preservados.</p></div><form method="get" className="finance-period"><label>Mês<input type="month" name="month" defaultValue={month} /></label><button>Ver período</button></form></header>
    <section className="finance-metrics" aria-label="Resumo financeiro">{view.metrics.map((metric) => <article data-tone={metric.tone} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></article>)}</section>
    <div className="finance-overdue" data-active={!view.overdueLabel.startsWith("0 ")}><span aria-hidden="true">●</span>{view.overdueLabel}</div>
    <section className="finance-workbench">
      <div className="finance-composer"><div><span className="eyebrow">NOVO REGISTRO</span><h2>Lançamento manual</h2><p>Registre uma entrada ou saída. Pedidos entram automaticamente.</p></div>
        <form onSubmit={submit}>
          <label className="wide">Título<input name="title" required minLength={2} maxLength={160} placeholder="Ex.: gás da cozinha" /></label>
          <label>Tipo<select name="kind"><option value="EXPENSE">Saída</option><option value="INCOME">Entrada</option></select></label>
          <label>Categoria<select name="category"><option value="OPERATIONS">Operação</option><option value="MARKETING">Marketing</option><option value="PEOPLE">Pessoas</option><option value="TAXES">Impostos</option><option value="OTHER">Outros</option></select></label>
          <label>Valor<input name="amount" required inputMode="decimal" placeholder="0,00" /></label>
          <label>Competência<input name="competenceDate" type="date" required defaultValue={defaultDate} /></label>
          <label>Vencimento<input name="dueDate" type="date" required defaultValue={defaultDate} /></label>
          <label className="wide">Descrição<textarea name="description" rows={2} placeholder="Contexto opcional para a equipe" /></label>
          <label className="finance-check"><input name="paid" type="checkbox" /> Já foi pago</label>
          <p className="form-message" role="status">{message}</p><button type="submit" disabled={pending}>{pending ? "Salvando…" : "Registrar lançamento"}</button>
        </form>
      </div>
      <div className="finance-ledger"><header><div><span className="eyebrow">MOVIMENTOS</span><h2>Livro do mês</h2></div><span>{view.entries.length} registro(s)</span></header>
        {view.entries.length ? <div className="finance-entry-list">{view.entries.map((entry) => <Link href={`/workspace/finance/entries/${entry.id}`} key={entry.id} data-status={entry.statusTone}>
          <span className="finance-entry-number">{entry.numberLabel}</span><div><strong>{entry.title}</strong><small>{entry.originLabel} · {entry.categoryLabel}</small></div><span>{entry.statusLabel}</span><time>{entry.dueLabel}</time><strong data-kind={entry.kind}>{entry.kind === "EXPENSE" ? "−" : "+"}{entry.amount}</strong>
        </Link>)}</div> : <div className="finance-empty"><strong>Nenhum lançamento neste mês</strong><p>Use o formulário ou simule uma compra na loja publicada.</p></div>}
      </div>
    </section>
  </main>
}
