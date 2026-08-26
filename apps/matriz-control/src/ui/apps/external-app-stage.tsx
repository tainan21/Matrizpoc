"use client"

import { useEffect, useRef, useState } from "react"
import type { InstallableAppViewModel } from "./installable-apps-presenter"
import styles from "./app-host.module.css"
import { HealthHostBridge } from "./health-host-bridge"

const visualTransitionMs = 1_000
const readinessRetryMs = 250
// Next's first Windows dev compilation can outlive the original four probes.
// Keep the probe itself bounded, but allow roughly twelve seconds overall for
// a cold runtime to begin serving its known base URL.
const defaultReadinessAttempts = 12

type ActivationResult = "ready" | "timeout" | "startup-failed" | "cancelled"
export interface ExternalAppActivation { readonly appId: string; readonly result: ActivationResult | "starting" }

interface ActivationInput {
  readonly app: InstallableAppViewModel
  readonly signal: AbortSignal
  readonly openSession: (projectId: string, signal: AbortSignal) => Promise<void>
  readonly wait: (milliseconds: number, signal: AbortSignal) => Promise<void>
  readonly checkReadiness: (appId: string, signal: AbortSignal) => Promise<boolean>
  readonly maxAttempts?: number
}

export async function activateExternalApp({ app, signal, openSession, wait, checkReadiness, maxAttempts = defaultReadinessAttempts }: ActivationInput): Promise<ActivationResult> {
  if (signal.aborted) return "cancelled"

  try {
    await openSession(app.projectId, signal)
    if (signal.aborted) return "cancelled"
    await wait(visualTransitionMs, signal)
  } catch {
    return signal.aborted ? "cancelled" : "startup-failed"
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
  const frameRef = useRef<HTMLIFrameElement>(null)
  if (!app) return null
  return <>
    <iframe ref={frameRef} className={styles.frame} src={app.baseUrl} title={app.name} />
    {app.appId === "health" ? <HealthHostBridge baseUrl={app.baseUrl} frameRef={frameRef} /> : null}
  </>
}

export function frameAppForActivation(app: InstallableAppViewModel | null, activation: ExternalAppActivation): InstallableAppViewModel | null {
  return app?.appId === activation.appId && activation.result === "ready" ? app : null
}

interface ExternalAppStageProps {
  readonly app: InstallableAppViewModel | null
  readonly openSession: (projectId: string, signal: AbortSignal) => Promise<void>
  readonly onOpenTerminal: () => void
}

export function ExternalAppStage({ app, openSession, onOpenTerminal }: ExternalAppStageProps) {
  const [activation, setActivation] = useState<ExternalAppActivation>({ appId: app?.appId ?? "", result: "starting" })
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
    setActivation({ appId: selectedApp.appId, result: "starting" })
    void activateExternalApp({
      app: selectedApp,
      signal: controller.signal,
      openSession: (projectId, signal) => openSessionRef.current(projectId, signal),
      wait: waitFor,
      checkReadiness,
    }).then((nextResult) => {
      if (!controller.signal.aborted) setActivation((current) => current.appId === selectedApp.appId ? { appId: selectedApp.appId, result: nextResult } : current)
    })
    return () => controller.abort()
  }, [appId, retry])

  if (!app) return null
  const result = activation.appId === app.appId ? activation.result : "starting"
  const frameApp = frameAppForActivation(app, activation)
  if (frameApp) return <section className={styles.stage} aria-label={`${app.name} externo`}><ExternalAppFrame app={frameApp} /></section>
  if (result === "startup-failed") return <section className={styles.stageMessage} aria-live="polite"><span aria-hidden="true">!</span><h1>Não foi possível iniciar {app.name}</h1><p>O Control não conseguiu iniciar o processo local. Consulte o terminal para ver o erro.</p><div><button type="button" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button><button type="button" onClick={onOpenTerminal}>Abrir terminal</button></div></section>
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
