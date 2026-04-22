"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth, type MagicLinkStartOutput } from "@matriz/platform-auth"
import { hubLoginCopy } from "../../../auth/config"

type Phase = "email" | "token" | "signed-in"

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "44px",
  borderRadius: "0.5rem",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--surface-fg)",
  padding: "0 0.75rem",
  fontSize: "0.875rem",
}

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  height: "44px",
  borderRadius: "0.5rem",
  background: "var(--brand)",
  color: "var(--brand-fg)",
  border: "none",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
}

const ghostButtonStyle: React.CSSProperties = {
  width: "100%",
  height: "40px",
  borderRadius: "0.5rem",
  background: "transparent",
  color: "var(--muted-fg)",
  border: "1px solid var(--border)",
  fontSize: "0.875rem",
  cursor: "pointer",
}

export function HubLoginScreen() {
  const router = useRouter()
  const { status, error, start, verify, signOut, defaultStrategyId, session } = useAuth()

  const [email, setEmail] = React.useState("")
  const [token, setToken] = React.useState("")
  const [displayedToken, setDisplayedToken] = React.useState<string | null>(null)
  const [phase, setPhase] = React.useState<Phase>(() =>
    session ? "signed-in" : "email",
  )

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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          padding: "1.5rem",
          borderRadius: "0.75rem",
          border: "1px solid var(--border)",
          background: "var(--muted)",
        }}
      >
        <div style={{ fontSize: "0.875rem", color: "var(--surface-fg)" }}>
          {`Voce ja esta autenticado como `}
          <strong>{session.identity.user.email}</strong>.
        </div>
        <button type="button" style={primaryButtonStyle} onClick={() => router.replace("/")}>
          Ir para o Hub
        </button>
        <button type="button" style={ghostButtonStyle} onClick={signOut}>
          Sair
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1.5rem",
        borderRadius: "0.75rem",
        border: "1px solid var(--border)",
        background: "var(--muted)",
      }}
    >
      <div style={{ fontSize: "0.875rem", color: "var(--surface-fg)" }}>{hubLoginCopy.tagline}</div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: "0.75rem",
            borderRadius: "0.5rem",
            background: "#fee2e2",
            color: "#991b1b",
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
            borderRadius: "0.5rem",
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            fontSize: "0.75rem",
            fontFamily: "ui-monospace, monospace",
            color: "var(--muted-fg)",
            wordBreak: "break-all",
          }}
        >
          <div style={{ marginBottom: "0.25rem", color: "var(--surface-fg)" }}>
            {"POC mode — seu token magico foi pre-preenchido abaixo:"}
          </div>
          {displayedToken}
        </div>
      ) : null}

      {phase === "email" ? (
        <form onSubmit={onSubmitEmail} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            aria-label="E-mail"
            style={inputStyle}
            type="email"
            required
            placeholder={hubLoginCopy.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" style={primaryButtonStyle} disabled={submitting || !email}>
            {submitting ? "Enviando…" : "Gerar link magico"}
          </button>
          <div style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>
            {`estrategia: ${defaultStrategyId}`}
          </div>
        </form>
      ) : (
        <form onSubmit={onSubmitToken} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            aria-label="Token"
            style={{ ...inputStyle, fontFamily: "ui-monospace, monospace", fontSize: "0.75rem" }}
            type="text"
            required
            placeholder="mlk_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button type="submit" style={primaryButtonStyle} disabled={submitting || !token}>
            {submitting ? "Validando…" : "Entrar"}
          </button>
          <button
            type="button"
            style={ghostButtonStyle}
            onClick={() => {
              setPhase("email")
              setToken("")
              setDisplayedToken(null)
            }}
          >
            Trocar e-mail
          </button>
        </form>
      )}

      <div style={{ fontSize: "0.75rem", color: "var(--muted-fg)", marginTop: "0.5rem" }}>
        {`status: ${status}`}
      </div>
    </div>
  )
}
