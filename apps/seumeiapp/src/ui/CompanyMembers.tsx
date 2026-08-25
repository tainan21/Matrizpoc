"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button, FormField, Input } from "@matriz/design-ui"
import type { CompanyRole } from "../domain/company"
import type { MemberDirectoryViewModel } from "./presenters/membership.presenter"

async function errorFrom(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null) as { error?: string } | null
  if (payload?.error === "membership_conflict") return "Os membros mudaram em outra sessão. Atualize e tente novamente."
  if (response.status === 403) return "Sua função não permite esta ação."
  if (response.status === 404) return "Este membro ou convite não está mais disponível."
  return "Não foi possível concluir a ação agora."
}

export function CompanyMembers({
  directory,
}: {
  readonly directory: MemberDirectoryViewModel
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [sharePath, setSharePath] = useState("")

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setPending(true)
    setMessage("")
    setSharePath("")
    const values = new FormData(formElement)
    try {
      const response = await fetch("/api/members/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: values.get("email"), role: values.get("role") }),
      })
      if (!response.ok) throw new Error(await errorFrom(response))
      const payload = await response.json() as { sharePath: string }
      setSharePath(payload.sharePath)
      setMessage("Convite criado. Nenhum e-mail foi enviado.")
      formElement.reset()
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o convite.")
    } finally {
      setPending(false)
    }
  }

  async function mutate(url: string, init: RequestInit) {
    setPending(true)
    setMessage("")
    try {
      const response = await fetch(url, init)
      if (!response.ok) throw new Error(await errorFrom(response))
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir a ação.")
    } finally {
      setPending(false)
    }
  }

  async function copyLink() {
    const absolute = new URL(sharePath, window.location.origin).toString()
    await navigator.clipboard?.writeText(absolute)
    setMessage("Link copiado. Compartilhe somente com a pessoa convidada.")
  }

  return (
    <main className="members-page">
      <header className="members-heading">
        <div><span className="eyebrow">ACESSO À EMPRESA</span><h1>Membros</h1></div>
        <p>Convide pessoas e ajuste responsabilidades. Toda alteração vale na próxima requisição.</p>
      </header>

      <section className="invite-member" aria-labelledby="invite-title">
        <div><span className="section-index">01</span><h2 id="invite-title">Novo convite</h2><p>O link expira em sete dias. Nenhum e-mail é enviado automaticamente.</p></div>
        <form onSubmit={invite}>
          <FormField id="member-email" label="E-mail do novo membro">
            <Input name="email" type="email" autoComplete="email" required disabled={pending} />
          </FormField>
          <FormField id="member-role" label="Papel inicial">
            <select id="member-role" name="role" defaultValue={directory.availableInvitationRoles.at(-1)?.value} disabled={pending}>
              {directory.availableInvitationRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </FormField>
          <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Criar convite"}</Button>
        </form>
      </section>

      {sharePath ? (
        <section className="share-result" aria-label="Link do convite">
          <label htmlFor="share-path">Link seguro</label>
          <div><input id="share-path" value={sharePath} readOnly /><Button variant="secondary" onClick={() => void copyLink()}>Copiar link</Button></div>
        </section>
      ) : null}

      <section className="member-directory" aria-labelledby="members-title">
        <div className="directory-title"><span className="section-index">02</span><h2 id="members-title">Pessoas com acesso</h2><span>{directory.members.length}</span></div>
        <ul>
          {directory.members.map((member) => (
            <li key={member.id}>
              <div className="member-identity"><span className="member-initial" aria-hidden="true">{member.name.slice(0, 1)}</span><div><strong>{member.name}{member.isCurrentUser ? " · você" : ""}</strong><span>{member.email}</span></div></div>
              <span className="role-label">{member.roleLabel}</span>
              <span className="joined-label">Desde {member.joinedAtLabel}</span>
              <div className="member-actions">
                {member.canChangeRole ? (
                  <label><span className="sr-only">Papel de {member.name}</span><select aria-label={`Papel de ${member.name}`} value={member.role} disabled={pending} onChange={(event) => void mutate(`/api/members/${member.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: event.target.value as CompanyRole }) })}>{member.availableRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
                ) : null}
                {member.canRemove ? <Button variant="secondary" disabled={pending} aria-label={`Remover ${member.name}`} onClick={() => void mutate(`/api/members/${member.id}`, { method: "DELETE" })}>Remover</Button> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="pending-invitations" aria-labelledby="pending-title">
        <div className="directory-title"><span className="section-index">03</span><h2 id="pending-title">Convites pendentes</h2><span>{directory.invitations.length}</span></div>
        {directory.invitations.length === 0 ? <p className="empty-copy">Nenhum convite pendente.</p> : <ul>{directory.invitations.map((invitation) => <li key={invitation.id}><div><strong>{invitation.email}</strong><span>{invitation.roleLabel} · expira em {invitation.expiresAtLabel}</span></div>{invitation.canRevoke ? <Button variant="secondary" disabled={pending} onClick={() => void mutate(`/api/members/invitations/${invitation.id}`, { method: "DELETE" })}>Revogar</Button> : null}</li>)}</ul>}
      </section>
      <p className="form-message members-message" role="status" aria-live="polite">{message}</p>
    </main>
  )
}
