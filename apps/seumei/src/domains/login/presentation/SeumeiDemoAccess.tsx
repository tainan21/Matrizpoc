"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@matriz/platform-auth/client"
import { SEUMEI_DEMO_EMAIL } from "../application/demo-account"

export function SeumeiDemoAccess() {
  const router = useRouter()
  const { broker, acceptSession } = useAuth()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function enterDemo() {
    if (!broker || busy) return
    setBusy(true)
    setError(null)
    try {
      const session = await broker.signInWithEmail(SEUMEI_DEMO_EMAIL)
      acceptSession(session)
      await broker.recordAppOpen("seumei")
      router.push("/hub")
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível iniciar o modo demo.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="seumei-demo-access">
      <div>
        <strong>Explorar com dados de demonstração</strong>
        <span>Galáxia Burger e Matriz Labs, totalmente isoladas.</span>
      </div>
      <button type="button" disabled={!broker || busy} onClick={() => void enterDemo()}>
        {busy ? "Preparando demo…" : "Entrar no modo demo"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  )
}
