"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@matriz/design-ui"
import type { InvitationAcceptanceViewModel } from "./presenters/membership.presenter"

export function InvitationAcceptance({
  token,
  invitation,
}: {
  readonly token: string
  readonly invitation: InvitationAcceptanceViewModel | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")

  async function accept() {
    setPending(true)
    setMessage("")
    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      })
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? `Entre com ${invitation?.invitedEmail ?? "o e-mail convidado"} para aceitar este convite.`
            : "Este convite não está mais disponível.",
        )
      }
      router.push("/workspace")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível aceitar o convite.")
    } finally {
      setPending(false)
    }
  }

  if (!invitation) {
    return <main className="invitation-page"><section><span className="eyebrow">CONVITE SEUMEI</span><h1>Convite indisponível</h1><p>O link expirou, foi revogado ou já não pode conceder acesso.</p><a href="/">Voltar às empresas</a></section></main>
  }

  return <main className="invitation-page"><section><a href="/" className="brand-lockup"><span className="brand-mark">S</span><strong>SEUMEI</strong></a><div className="invitation-copy"><span className="eyebrow">CONVITE PARA EMPRESA</span><h1>{invitation.companyName}</h1><p>Você foi convidado como <strong>{invitation.roleLabel}</strong>. O acesso expira em {invitation.expiresAtLabel}.</p></div>{invitation.canAccept ? <Button size="lg" disabled={pending} onClick={() => void accept()}>{pending ? "Aceitando…" : "Aceitar convite"}</Button> : <p className="invitation-warning">Entre com {invitation.invitedEmail} para aceitar este convite.</p>}<p className="form-message" role="status" aria-live="polite">{message}</p></section></main>
}
