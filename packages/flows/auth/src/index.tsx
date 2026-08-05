"use client"

import { useEffect, useReducer, type FormEvent, type ReactNode } from "react"
import type { MatrizAppId } from "@matriz/foundation-constants"
import { MatrizAuthLayout } from "@matriz/design-ui"
import { MOCK_GOOGLE_ACCOUNTS, type AuthMethodId } from "@matriz/platform-auth"
import { useAuth } from "@matriz/platform-auth/client"
import { createLoginState, loginFlowReducer, shouldVerifyMagicLink } from "./login-machine"

export { createLoginState, loginFlowReducer, shouldVerifyMagicLink } from "./login-machine"
export type { LoginFlowAction, LoginFlowState } from "./login-machine"

export interface LoginSkin {
  readonly appId: MatrizAppId
  readonly product: string
  readonly productLabel: string
  readonly mark: string
  readonly eyebrow: string
  readonly headline: string
  readonly description: string
  readonly panelTitle: string
  readonly footer: string
  readonly emailPlaceholder: string
  readonly defaultMethod: AuthMethodId
  readonly methods: readonly AuthMethodId[]
}

export interface SharedLoginFlowProps {
  readonly skin: LoginSkin
  readonly redirectTo?: string
  readonly storySupplement?: ReactNode
  readonly panelSupplement?: ReactNode
}

const METHOD_LABELS: Record<AuthMethodId, string> = {
  google: "Google",
  otp: "Codigo",
  "magic-link": "Magic link",
  email: "E-mail direto",
}

export function SharedLoginFlow({ skin, redirectTo = "/", storySupplement, panelSupplement }: SharedLoginFlowProps) {
  const { broker, acceptSession, session, signOut, status } = useAuth()
  const [state, dispatch] = useReducer(loginFlowReducer, skin.defaultMethod, createLoginState)
  const busy = state.phase === "loading"

  useEffect(() => {
    const token = new URL(window.location.href).searchParams.get("magic_token")
    if (!broker || !shouldVerifyMagicLink(status, token, Boolean(session))) return
    dispatch({ type: "loading" })
    broker.verifyMagicLink(token!)
      .then((next) => { acceptSession(next); dispatch({ type: "signed-in" }); window.history.replaceState({}, "", window.location.pathname) })
      .catch((error: unknown) => dispatch({ type: "failed", message: errorMessage(error) }))
  }, [acceptSession, broker, session, status])

  async function complete(operation: () => Promise<Parameters<typeof acceptSession>[0]>) {
    dispatch({ type: "loading" })
    try {
      const next = await operation()
      acceptSession(next)
      await broker?.recordAppOpen(skin.appId)
      dispatch({ type: "signed-in" })
    } catch (error) {
      dispatch({ type: "failed", message: errorMessage(error) })
    }
  }

  async function startChallenge(event: FormEvent) {
    event.preventDefault()
    if (!broker || (state.method !== "otp" && state.method !== "magic-link")) return
    dispatch({ type: "loading" })
    try {
      const challenge = await broker.startChallenge(state.method, state.email)
      dispatch({ type: "challenge.started", challenge })
    } catch (error) { dispatch({ type: "failed", message: errorMessage(error) }) }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault()
    if (!broker || !state.challenge) return
    await complete(() => broker.verifyOtp(state.challenge!.id, state.code))
  }

  const form = session ? (
    <section className="shared-login-signed-in">
      <p>Conectado como <strong>{session.identity.user.email}</strong>.</p>
      <button className="shared-login-primary" type="button" onClick={() => window.location.assign(redirectTo)}>Abrir {skin.product}</button>
      <button className="shared-login-secondary" type="button" onClick={signOut}>Sair de todas as plataformas</button>
    </section>
  ) : (
    <section className="shared-login-flow">
      <div className="shared-login-methods" role="tablist" aria-label="Metodos de entrada">
        {skin.methods.map((method) => (
          <button key={method} type="button" role="tab" aria-selected={state.method === method} onClick={() => dispatch({ type: "method.selected", method })}>{METHOD_LABELS[method]}</button>
        ))}
      </div>

      {state.message ? <div className="shared-login-alert" role="alert">{state.message}<a href="http://localhost:3000">Abrir Hub</a></div> : null}
      <div aria-live="polite" className="shared-login-status">{busy ? "Processando acesso…" : methodDescription(state.method)}</div>

      {state.method === "google" ? (
        <div className="shared-login-google-list">
          {MOCK_GOOGLE_ACCOUNTS.map((account) => (
            <button key={account.id} type="button" disabled={busy || !broker} onClick={() => broker && void complete(() => broker.signInWithGoogle(account.id))}>
              <span className="shared-login-avatar" aria-hidden="true">{account.name.slice(0, 1)}</span>
              <span><strong>{account.name}</strong><small>{account.email}</small></span><b aria-hidden="true">G</b>
            </button>
          ))}
          <button className="shared-login-use-email" type="button" onClick={() => dispatch({ type: "method.selected", method: "email" })}>Usar outro e-mail</button>
        </div>
      ) : state.phase === "challenge" && state.challenge ? (
        state.method === "otp" ? (
          <form onSubmit={verifyOtp} className="shared-login-form">
            <label htmlFor={`${skin.appId}-otp`}>Codigo de seis digitos</label>
            <input id={`${skin.appId}-otp`} className="shared-login-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={state.code} onChange={(event) => dispatch({ type: "code.changed", code: event.target.value })} placeholder="000000" />
            <p className="shared-login-preview">Codigo local: <strong>{state.challenge.hint}</strong></p>
            <button className="shared-login-primary" disabled={busy || state.code.length !== 6}>Validar codigo</button>
            <button className="shared-login-secondary" type="button" onClick={() => dispatch({ type: "challenge.reset" })}>Trocar e-mail</button>
          </form>
        ) : (
          <div className="shared-login-link-sent">
            <span aria-hidden="true">✓</span><strong>Link preparado</strong><p>No produto real, ele seria enviado para {state.challenge.email}.</p>
            <a className="shared-login-primary" href={state.challenge.previewUrl}>Abrir link de teste</a>
            <button className="shared-login-secondary" type="button" onClick={() => dispatch({ type: "challenge.reset" })}>Trocar e-mail</button>
          </div>
        )
      ) : (
        <form onSubmit={state.method === "email" ? (event) => { event.preventDefault(); if (broker) void complete(() => broker.signInWithEmail(state.email)) } : startChallenge} className="shared-login-form">
          <label htmlFor={`${skin.appId}-email`}>E-mail</label>
          <input id={`${skin.appId}-email`} type="email" autoComplete="email" required value={state.email} onChange={(event) => dispatch({ type: "email.changed", email: event.target.value })} placeholder={skin.emailPlaceholder} />
          <button className="shared-login-primary" disabled={busy || !broker || !state.email}>{busy ? "Processando…" : state.method === "email" ? "Entrar com e-mail" : state.method === "otp" ? "Enviar codigo" : "Enviar magic link"}</button>
        </form>
      )}
    </section>
  )

  return <MatrizAuthLayout {...skin} storySupplement={storySupplement}><>{form}{panelSupplement}</></MatrizAuthLayout>
}

function methodDescription(method: AuthMethodId): string {
  if (method === "google") return "Escolha uma conta Google de demonstracao."
  if (method === "otp") return "Receba um codigo mockado de seis digitos."
  if (method === "magic-link") return "Gere um link local, descartavel e valido por dez minutos."
  return "Acesse imediatamente com um e-mail valido."
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Nao foi possivel concluir o acesso."
}
