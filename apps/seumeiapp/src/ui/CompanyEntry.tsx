"use client"

import { useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button, FormField, Input } from "@matriz/design-ui"
import type { CompanyChoiceViewModel } from "./presenters/company.presenter"

interface CompanyEntryProps {
  readonly initialCompanies: readonly CompanyChoiceViewModel[]
  readonly availability?: "ready" | "unavailable" | "forbidden"
}

export function CompanyEntry({ initialCompanies, availability = "ready" }: CompanyEntryProps) {
  const router = useRouter()
  const idempotencyKey = useRef(globalThis.crypto.randomUUID())
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  if (availability !== "ready") {
    return <main className="status-page"><span className="eyebrow">ESTADO DO SERVIÇO</span><h1>{availability === "unavailable" ? "Seumei temporariamente indisponível" : "Acesso não autorizado"}</h1><p>{availability === "unavailable" ? "A conexão com os dados não está configurada. Tente novamente mais tarde." : "Não foi possível validar sua sessão para esta empresa."}</p></main>
  }

  async function selectCompany(company: CompanyChoiceViewModel) {
    setPending(true); setError("")
    try {
      const response = await fetch("/api/company-selection", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId: company.id }) })
      if (!response.ok) throw new Error(response.status === 403 ? "Esta empresa não está disponível para sua sessão." : "Não foi possível abrir a empresa agora.")
      router.push(company.statusLabel === "Empresa ativa" ? "/workspace" : "/onboarding")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível abrir a empresa agora.")
    } finally { setPending(false) }
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("")
    const values = new FormData(event.currentTarget)
    try {
      const response = await fetch("/api/companies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: values.get("name"), slug: values.get("slug") || undefined, idempotencyKey: idempotencyKey.current }) })
      const payload = await response.json() as { company?: CompanyChoiceViewModel; error?: string }
      if (response.status === 409 && payload.error === "company_slug_conflict") throw new Error("Esse endereço já está em uso. Escolha outro.")
      if (!response.ok || !payload.company) throw new Error("Não foi possível criar a empresa agora.")
      const selection = await fetch("/api/company-selection", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId: payload.company.id }) })
      if (!selection.ok) throw new Error("A empresa foi criada, mas não foi possível abri-la. Atualize a página.")
      router.push("/onboarding")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar a empresa agora.")
    } finally { setPending(false) }
  }

  return <main className="entry-page">
    <header className="entry-heading"><span className="eyebrow">SUAS EMPRESAS</span><h1>Escolha onde trabalhar.</h1><p>A sessão mostra somente empresas das quais você faz parte.</p></header>
    <section className="company-list" aria-labelledby="company-list-title">
      <h2 id="company-list-title">Empresas disponíveis</h2>
      {initialCompanies.length === 0 ? <p className="empty-copy">Nenhuma empresa por aqui ainda.</p> : <ul>{initialCompanies.map(company => <li key={company.id}><div><strong>{company.name}</strong><span>{company.statusLabel}</span></div><Button variant="secondary" disabled={pending} onClick={() => void selectCompany(company)}>{company.actionLabel}</Button></li>)}</ul>}
    </section>
    <section className="create-company" aria-labelledby="create-company-title"><div><span className="eyebrow">NOVA EMPRESA</span><h2 id="create-company-title">Comece com o essencial.</h2><p>Nome e endereço agora. Operação e preferências vêm na sequência.</p></div>
      <form onSubmit={createCompany}>
        <FormField id="company-name" label="Nome da empresa"><Input name="name" autoComplete="organization" required minLength={2} disabled={pending} /></FormField>
        <FormField id="company-slug" label="Endereço da empresa" helper="Opcional. Ex.: oficina-aurora"><Input name="slug" inputMode="url" disabled={pending} /></FormField>
        <Button type="submit" size="lg" disabled={pending}>{pending ? "Criando…" : "Criar empresa"}</Button>
      </form>
    </section>
    <p className="form-message" role="status" aria-live="polite">{error}</p>
  </main>
}
