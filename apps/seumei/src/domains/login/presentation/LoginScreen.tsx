"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth, type OtpStartOutput } from "@matriz/platform-auth/client"
import { seumeiLoginCopy } from "../../../auth/config"

type Phase = "email" | "code" | "signed-in"

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "var(--color-muted-foreground)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "44px",
  padding: "0 0.75rem",
  borderRadius: "0.375rem",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-foreground)",
  fontSize: "0.9375rem",
  marginTop: "0.375rem",
}

const codeInputStyle: React.CSSProperties = {
  ...inputStyle,
  textAlign: "center",
  fontFamily: "ui-monospace, monospace",
  fontSize: "1.5rem",
  letterSpacing: "0.5em",
  height: "56px",
}

const primaryBtn: React.CSSProperties = {
  width: "100%",
  height: "44px",
  borderRadius: "0.375rem",
  background: "var(--color-foreground)",
  color: "var(--color-background)",
  border: "none",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
}

const ghostBtn: React.CSSProperties = {
  width: "100%",
  height: "40px",
  borderRadius: "0.375rem",
  background: "transparent",
  color: "var(--color-muted-foreground)",
  border: "1px solid var(--color-border)",
  fontSize: "0.8125rem",
  cursor: "pointer",
}

export function SeumeiLoginScreen() {
  const router = useRouter()
  const { status, error, start, verify, signOut, defaultStrategyId, session } = useAuth()
  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [hint, setHint] = React.useState<string | null>(null)
  const [phase, setPhase] = React.useState<Phase>(() => (session ? "signed-in" : "email"))

  React.useEffect(() => {
    if (session) setPhase("signed-in")
  }, [session])

  const submitting = status === "signing-in"

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault()
    const out = await start<{ email: string }, OtpStartOutput>(defaultStrategyId, { email })
    if (out) {
      setHint(out.hint)
      setPhase("code")
    }
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault()
    const sess = await verify(defaultStrategyId, { email, code })
    if (sess) router.replace("/")
  }

  if (phase === "signed-in" && session) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--color-foreground)" }}>
          {"Voce ja esta autenticado."}
        </h2>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-muted-foreground)" }}>
          {`Sessao ativa para ${session.identity.user.email}.`}
        </p>
        <button type="button" style={primaryBtn} onClick={() => router.replace("/")}>
          Ir para o Seumei
        </button>
        <button type="button" style={ghostBtn} onClick={signOut}>
          Sair
        </button>
      </section>
    )
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--color-foreground)" }}>
          {seumeiLoginCopy.headline}
        </h2>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-muted-foreground)" }}>
          {phase === "email"
            ? seumeiLoginCopy.tagline
            : "Digite o codigo que enviamos para o seu email."}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          style={{
            padding: "0.75rem",
            borderRadius: "0.375rem",
            background: "var(--danger-soft)",
            color: "var(--danger)",
            fontSize: "0.8125rem",
          }}
        >
          {error.message}
        </div>
      ) : null}

      {hint && phase === "code" ? (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            background: "var(--color-surface)",
            border: "1px dashed var(--color-border)",
            fontSize: "0.75rem",
            color: "var(--color-muted-foreground)",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {hint}
        </div>
      ) : null}

      {phase === "email" ? (
        <form onSubmit={onSubmitEmail} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ display: "block" }}>
            <span style={labelStyle}>Email operacional</span>
            <input
              aria-label="Email"
              style={inputStyle}
              type="email"
              required
              placeholder={seumeiLoginCopy.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button type="submit" style={primaryBtn} disabled={submitting || !email}>
            {submitting ? "Enviando…" : seumeiLoginCopy.primaryCta}
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmitCode} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ display: "block" }}>
            <span style={labelStyle}>Codigo de 6 digitos</span>
            <input
              aria-label="Codigo"
              style={codeInputStyle}
              type="text"
              required
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button type="submit" style={primaryBtn} disabled={submitting || code.length < 6}>
            {submitting ? "Validando…" : "Entrar"}
          </button>
          <button
            type="button"
            style={ghostBtn}
            onClick={() => {
              setPhase("email")
              setCode("")
              setHint(null)
            }}
          >
            Trocar email
          </button>
        </form>
      )}

      <div style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}>
        {`status: ${status} · estrategia: ${defaultStrategyId}`}
      </div>
    </section>
  )
}
