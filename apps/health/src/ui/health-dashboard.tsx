"use client"

import { useEffect, useState, type CSSProperties } from "react"
import type { SystemSnapshot } from "../domain/system-health"
import {
  toSystemHealthVM,
  type MetricVM,
  type SystemHealthVM,
} from "./presenters/system-health-presenter"

const POLL_INTERVAL_MS = 1_000
const RETRY_DELAYS_MS = [2_000, 5_000] as const
const PROCESS_LIMIT = 8

export interface HealthPollingState {
  readonly view: SystemHealthVM | null
  readonly stale: boolean
}

export interface HealthPollerDependencies {
  readonly read: () => Promise<SystemHealthVM>
  readonly isVisible: () => boolean
  readonly subscribeToVisibility: (listener: () => void) => () => void
  readonly onStateChange: (state: HealthPollingState) => void
}

export function createHealthPoller(deps: HealthPollerDependencies) {
  let active = false
  let inFlight = false
  let retryCount = 0
  let state: HealthPollingState = { view: null, stale: false }
  let timer: ReturnType<typeof setTimeout> | undefined
  let unsubscribe: (() => void) | undefined

  const clearScheduledRead = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  const schedule = (delayMs: number) => {
    clearScheduledRead()
    if (!active || !deps.isVisible()) return
    timer = setTimeout(() => {
      timer = undefined
      void poll()
    }, delayMs)
  }

  const poll = async () => {
    if (!active || !deps.isVisible() || inFlight) return
    inFlight = true

    try {
      const view = await deps.read()
      if (!active) return
      retryCount = 0
      state = { view, stale: false }
      deps.onStateChange(state)
      schedule(POLL_INTERVAL_MS)
    } catch {
      if (!active) return
      retryCount = Math.min(retryCount + 1, RETRY_DELAYS_MS.length)
      state = { view: state.view, stale: true }
      deps.onStateChange(state)
      schedule(RETRY_DELAYS_MS[retryCount - 1]!)
    } finally {
      inFlight = false
    }
  }

  const onVisibilityChange = () => {
    if (!deps.isVisible()) {
      clearScheduledRead()
      return
    }
    schedule(0)
  }

  return {
    start() {
      if (active) return
      active = true
      unsubscribe = deps.subscribeToVisibility(onVisibilityChange)
      schedule(0)
    },
    stop() {
      active = false
      clearScheduledRead()
      unsubscribe?.()
      unsubscribe = undefined
    },
  }
}

export function HealthDashboard() {
  const [state, setState] = useState<HealthPollingState>({ view: null, stale: false })

  useEffect(() => {
    const poller = createHealthPoller({
      read: loadSystemHealthVM,
      isVisible: () => document.visibilityState === "visible",
      subscribeToVisibility: (listener) => {
        document.addEventListener("visibilitychange", listener)
        return () => document.removeEventListener("visibilitychange", listener)
      },
      onStateChange: setState,
    })
    poller.start()
    return () => poller.stop()
  }, [])

  if (state.view === null) {
    return (
      <main className="health-dashboard health-dashboard--loading" aria-live="polite">
        <p className="health-dashboard__eyebrow">MONITOR LOCAL</p>
        <h1>Saúde do sistema</h1>
        <p>Conectando ao sensor local…</p>
      </main>
    )
  }

  const { view } = state
  return (
    <main className="health-dashboard">
      <header className="health-dashboard__header">
        <div>
          <p className="health-dashboard__eyebrow">MONITOR LOCAL · WINDOWS</p>
          <h1>Saúde do sistema</h1>
          <p>Leitura leve de recursos e processos deste computador.</p>
        </div>
        <div className="health-dashboard__connection" aria-live="polite">
          <span className={`health-dashboard__indicator${state.stale ? " health-dashboard__indicator--stale" : ""}`} aria-hidden="true" />
          <div>
            <strong>{state.stale ? "Leitura desatualizada" : "Conectado"}</strong>
            <span>Atualizado {view.sampledAt}</span>
          </div>
        </div>
      </header>

      <section className="health-dashboard__metrics" aria-label="Métricas do sistema">
        <MetricCard metric={view.cpu} />
        <MetricCard metric={view.memory} />
        <MetricCard metric={view.temperature} />
        <MetricCard metric={view.uptime} />
      </section>

      <section className="health-processes" aria-labelledby="health-processes-title">
        <div className="health-processes__header">
          <div>
            <p className="health-dashboard__eyebrow">PROCESSOS</p>
            <h2 id="health-processes-title">Maior consumo observado</h2>
          </div>
          <span>até {PROCESS_LIMIT} processos</span>
        </div>
        <div className="health-processes__table-wrap">
          <table>
            <thead>
              <tr><th scope="col">Processo</th><th scope="col">PID</th><th scope="col">CPU</th><th scope="col">Memória</th></tr>
            </thead>
            <tbody>
              {view.processes.slice(0, PROCESS_LIMIT).map((process) => (
                <tr key={`${process.pid}-${process.name}`}>
                  <th scope="row">{process.name}</th><td>{process.pid}</td><td>{process.cpu}</td><td>{process.memory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function MetricCard({ metric }: { readonly metric: MetricVM }) {
  const progress = metric.percent === null ? 0 : Math.max(0, Math.min(100, metric.percent))
  return (
    <article className={`health-metric health-metric--${metric.tone}`}>
      <div className="health-metric__heading"><p>{metric.label}</p><span>{metric.tone === "unavailable" ? "Sensor" : metric.tone}</span></div>
      <strong>{metric.value}</strong>
      <p>{metric.detail}</p>
      <div className="health-metric__bar" aria-hidden="true" style={{ "--health-progress": `${progress}%` } as CSSProperties} />
    </article>
  )
}

async function loadSystemHealthVM(): Promise<SystemHealthVM> {
  const response = await fetch("/api/system/snapshot", { cache: "no-store" })
  if (!response.ok) throw new Error("snapshot_unavailable")
  const snapshot = await response.json() as SystemSnapshot
  return toSystemHealthVM(snapshot)
}
