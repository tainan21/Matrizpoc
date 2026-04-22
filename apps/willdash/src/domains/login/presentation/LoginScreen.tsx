"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth, type MagicLinkStartOutput } from "@matriz/platform-auth/client"
import { willdashLoginCopy } from "../../../auth/config"

type Phase = "email" | "token" | "signed-in"

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "42px",
  padding: "0 0.625rem",
  border: "1px solid var(--color-border)",
  background: "var(--color-background)",
  color: "var(--color-foreground)",
  fontFamily: "ui-monospace, monospace",
  fontSize: "0.8125rem",
  borderRadius: 0,
}

const primaryBtn: React.CSSProperties = {
  width: "100%",
  height: "42px",
  background: "var(--color-foreground)",
  color: "var(--color-background)",
  border: "none",
  fontFamily: "ui-monospace, monospace",
  fontSize: "0.75rem",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  cursor: "pointer",
  borderRadius: 0,
}

const ghostBtn: React.CSSProperties = {
  ...primaryBtn,
  background: "transparent",
  color: "var(--color-muted-foreground)",
  border: "1px solid var(--color-border)",
}

export function WilldashLoginScreen() {
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
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ fontSize: "0.8125rem", color: "var(--color-foreground)" }}>
          {`session_active=true user=${session.identity.user.email}`}
        </div>
        <button type="button" style={primaryBtn} onClick={() => router.replace("/")}>
          open dashboard
        </button>
        <button type="button" style={ghostBtn} onClick={signOut}>
          logout
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <div style={{ fontSize: "0.8125rem", color: "var(--color-foreground)", lineHeight: 1.6 }}>
        {willdashLoginCopy.tagline}
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid #991b1b",
            color: "#991b1b",
            fontSize: "0.75rem",
          }}
        >
          {`err: ${error.message}`}
        </div>
      ) : null}

      {displayedToken && phase === "token" ? (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px dashed var(--color-border)",
            fontSize: "0.75rem",
            color: "var(--color-muted-foreground)",
            wordBreak: "break-all",
          }}
        >
          <div style={{ color: "var(--color-foreground)", marginBottom: "0.25rem" }}>
            {"poc_token (pre-filled):"}
          </div>
          {displayedToken}
        </div>
      ) : null}

      {phase === "email" ? (
        <form onSubmit={onSubmitEmail} style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <input
            aria-label="Email"
            style={inputStyle}
            type="email"
            required
            placeholder={willdashLoginCopy.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" style={primaryBtn} disabled={submitting || !email}>
            {submitting ? "requesting…" : "request magic link"}
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmitToken} style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <input
            aria-label="Token"
            style={inputStyle}
            type="text"
            required
            placeholder="mlk_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button type="submit" style={primaryBtn} disabled={submitting || !token}>
            {submitting ? "verifying…" : "verify"}
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
            reset
          </button>
        </form>
      )}

      <div
        style={{
          fontSize: "0.625rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--color-muted-foreground)",
        }}
      >
        {`status=${status} strategy=${defaultStrategyId}`}
      </div>
    </div>
  )
}
