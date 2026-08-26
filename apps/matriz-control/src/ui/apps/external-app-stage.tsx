"use client"

import { useEffect, useRef, useState } from "react"
import type { InstallableAppViewModel } from "./installable-apps-presenter"
import styles from "./app-host.module.css"

const visualTransitionMs = 1_000
const readinessRetryMs = 250
const defaultReadinessAttempts = 4

type ActivationResult = "ready" | "timeout" | "cancelled"

interface ActivationInput {
  readonly app: InstallableAppViewModel
  readonly signal: AbortSignal
  readonly openSession: (projectId: string) => Promise<void>
  readonly wait: (milliseconds: number, signal: AbortSignal) => Promise<void>
  readonly checkReadiness: (appId: string, signal: AbortSignal) => Promise<boolean>
  readonly maxAttempts?: number
}

export async function activateExternalApp({ app, signal, openSession, wait, checkReadiness, maxAttempts = defaultReadinessAttempts }: ActivationInput): Promise<ActivationResult> {
  if (signal.aborted) return "cancelled"

  try {
    await openSession(app.projectId)
    if (signal.aborted) return "cancelled"
    await wait(visualTransitionMs, signal)
  } catch {
    return signal.aborted ? "cancelled" : "timeout"
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal.aborted) return "cancelled"

    try {
      if (await checkReadiness(app.appId, signal)) return "ready"
    } catch {
      if (signal.aborted) return "cancelled"
    }

    if (attempt < maxAttempts - 1) {
      try {
        await wait(readinessRetryMs, signal)
      } catch {
        return signal.aborted ? "cancelled" : "timeout"
      }
    }
  }

  return signal.aborted ? "cancelled" : "timeout"
}

export function ExternalAppFrame({ app }: { readonly app: InstallableAppViewModel | null }) {
  if (!app) return null
  return <iframe className={styles.frame} src={app.baseUrl} title={app.name} />
}

interface ExternalAppStageProps {
  readonly app: InstallableAppViewModel | null
  readonly openSession: (projectId: string) => Promise<void>
  readonly onOpenTerminal: () => void
}

export function ExternalAppStage({ app, openSession, onOpenTerminal }: ExternalAppStageProps) {
  const [result, setResult] = useState<ActivationResult | "starting">("starting")
  const [retry, setRetry] = useState(0)
  const appId = app?.appId
  const appRef = useRef(app)
  const openSessionRef = useRef(openSession)

  useEffect(() => { appRef.current = app }, [app])
  useEffect(() => { openSessionRef.current = openSession }, [openSession])

  useEffect(() => {
    const selectedApp = appRef.current
    if (!selectedApp) return
    const controller = new AbortController()
    setResult("starting")
    void activateExternalApp({
      app: selectedApp,
      signal: controller.signal,
      openSession: (projectId) => openSessionRef.current(projectId),
      wait: waitFor,
      checkReadiness,
    }).then((nextResult) => {
      if (!controller.signal.aborted) setResult(nextResult)
    })
    return () => controller.abort()
  }, [appId, retry])

  if (!app) return null
  if (result === "ready") return <section className={styles.stage} aria-label={`${app.name} externo`}><ExternalAppFrame app={app} /></section>
  if (result === "timeout") return <section className={styles.stageMessage} aria-live="polite"><span aria-hidden="true">!</span><h1>{app.name} não respondeu</h1><p>O Control iniciou o runtime, mas a verificação local não confirmou disponibilidade.</p><div><button type="button" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button><button type="button" onClick={onOpenTerminal}>Abrir terminal</button></div></section>

  return <section className={styles.stageMessage} aria-live="polite"><span className={styles.loading} aria-hidden="true">{app.glyph}</span><h1>Abrindo {app.name}</h1><p>Iniciando o processo local e verificando a disponibilidade.</p></section>
}

async function checkReadiness(appId: string, signal: AbortSignal): Promise<boolean> {
  const response = await fetch(`/api/apps/readiness?appId=${encodeURIComponent(appId)}`, { cache: "no-store", signal })
  if (!response.ok) return false
  const body = await response.json() as { appId?: unknown; ready?: unknown }
  return body.appId === appId && body.ready === true
}

function waitFor(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, milliseconds)
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}
