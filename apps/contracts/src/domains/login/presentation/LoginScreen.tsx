"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth, type MagicLinkStartOutput } from "@matriz/platform-auth/client"
import { contractsLoginCopy } from "../../../auth/config"

type Phase = "email" | "token" | "signed-in"

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "46px",
  padding: "0 0.75rem",
  border: "1px solid var(--color-border)",
  borderRadius: "2px",
  background: "var(--color-surface)",
  color: "var(--color-foreground)",
  fontFamily: "Georgia, ui-serif, serif",
  fontSize: "1rem",
}

const primaryBtn: React.CSSProperties = {
  width: "100%",
  height: "46px",
  background: "var(--color-foreground)",
  color: "var(--color-background)",
  border: "none",
  borderRadius: "2px",
  fontFamily: "ui-sans-serif, -apple-system, sans-serif",
  fontSize: "0.8125rem",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  cursor: "pointer",
}

const ghostBtn: React.CSSProperties = {
  ...primaryBtn,
  background: "transparent",
  color: "var(--color-muted-foreground)",
  border: "1px solid var(--color-border)",
}

export function ContractsLoginScreen() {
  const router = useRouter()
  const { status, error, start, verify, signOut, defaultStrategyId, session } = useAuth()
  const [email, setEmail] = React.useState("")
  const [token, setToken] = React.useState("")
  const [displayedToken, setDisplayedToken] = React.useState<string | null>(null)
  const [phase, setPhase] = React.useState<Phase>(() => (session ? "signed-in" : "email"))

  React.useEffect(() => {
    if (session) setPhase("signed-in")
  }, [session])

  const submitting = status === "signing-in"

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault()
    const out = await start<{ email: string }, MagicLinkStartOutput>(
      defaultStrategyId,
      { email },
    )
    if (out) {
      setDisplayedToken(out.token)
      setToken(out.token)
      setPhase("token")
    }
  }

  async function onSubmitToken(e: React.FormEvent) {
    e.preventDefault()
    const sess = await verify(defaultStrategyId, { token })
    if (sess) router.replace("/")
  }

  if (phase === "signed-in" && session) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ margin: 0, color: "var(--color-foreground)", fontSize: "1rem" }}>
          {`Sessao ativa para ${session.identity.user.email}.`}
        </p>
        <button type="button" style={primaryBtn} onClick={() => router.replace("/")}>
          Abrir Contratos
        </button>
        <button type="button" style={ghostBtn} onClick={signOut}>
          Sair
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ margin: 0, fontSize: "0.9375rem", color: "var(--color-foreground)", lineHeight: 1.6 }}>
        {phase === "email" ? contractsLoginCopy.tagline : "Informe o token recebido para concluir o acesso."}
      </p>

      {error ? (
        <div
          role="alert"
          style={{
            padding: "0.75rem",
            borderLeft: "3px solid #991b1b",
            background: "#fef2f2",
            color: "#991b1b",
            fontFamily: "ui-sans-serif, -apple-system, sans-serif",
            fontSize: "0.8125rem",
          }}
        >
          {error.message}
        </div>
      ) : null}

      {displayedToken && phase === "token" ? (
        <div
          style={{
            padding: "0.75rem",
            background: "var(--color-surface)",
            border: "1px dashed var(--color-border)",
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.75rem",
            color: "var(--color-muted-foreground)",
            wordBreak: "break-all",
          }}
        >
          <div style={{ marginBottom: "0.25rem", color: "var(--color-foreground)", fontFamily: "inherit" }}>
            {"POC mode — token pre-preenchido:"}
          </div>
          {displayedToken}
        </div>
      ) : null}

      {phase === "email" ? (
        <form onSubmit={onSubmitEmail} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            aria-label="Email"
            style={inputStyle}
            type="email"
            required
            placeholder={contractsLoginCopy.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" style={primaryBtn} disabled={submitting || !email}>
            {submitting ? "Enviando…" : "Solicitar link"}
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmitToken} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            aria-label="Token"
            style={{ ...inputStyle, fontFamily: "ui-monospace, monospace", fontSize: "0.8125rem" }}
            type="text"
            required
            placeholder="mlk_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button type="submit" style={primaryBtn} disabled={submitting || !token}>
            {submitting ? "Validando…" : "Entrar"}
          </button>
          <button
            type="button"
            style={ghostBtn}
            onClick={() => {
              setPhase("email")
              setToken("")
              setDisplayedToken(null)
            }}
          >
            Trocar email
          </button>
        </form>
      )}

      <div style={{ fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)", fontFamily: "ui-monospace, monospace" }}>
        {`status: ${status} · estrategia: ${defaultStrategyId}`}
      </div>
    </div>
  )
}
