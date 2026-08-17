"use client"

import { useState, useTransition } from "react"
import { SurfaceState } from "../../../src/ui/environment/SurfaceState"
import { StatusLabel } from "../../../src/ui/environment/status"
import { MetricStrip } from "../../../src/ui/structure/OperationalPage"
import type { HealthCheckKind } from "../../../src/domains/health-checks/domain"
import type { HealthCheckRunVM } from "../../../src/domains/health-checks/presenter"
import { runHealthCheckAction } from "./actions"
import styles from "./health-checks.module.css"

type LatestResults = Readonly<Record<string, {
  readonly routes: HealthCheckRunVM | null
  readonly apis: HealthCheckRunVM | null
}>>

export function HealthChecksPanel({
  environments,
  initialResults,
}: {
  readonly environments: readonly string[]
  readonly initialResults: LatestResults
}) {
  const [environment, setEnvironment] = useState(environments[0] ?? "development")
  const [results, setResults] = useState<LatestResults>(initialResults)
  const [message, setMessage] = useState("")
  const [runningKind, setRunningKind] = useState<HealthCheckKind | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(kind: HealthCheckKind) {
    setRunningKind(kind)
    setMessage("")
    startTransition(async () => {
      const response = await runHealthCheckAction(kind, environment)
      setMessage(response.message)
      if (response.result) {
        setResults((current) => ({
          ...current,
          [environment]: {
            routes: kind === "routes" ? response.result : current[environment]?.routes ?? null,
            apis: kind === "apis" ? response.result : current[environment]?.apis ?? null,
          },
        }))
      }
      setRunningKind(null)
    })
  }

  const selected = results[environment] ?? { routes: null, apis: null }

  return (
    <div className={styles.workspace}>
      <div className={styles.toolbar}>
        <label>
          <span>Ambiente</span>
          <select
            disabled={isPending}
            onChange={(event) => { setEnvironment(event.target.value); setMessage("") }}
            value={environment}
          >
            {environments.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <p>Os destinos são fixos no servidor; esta tela nunca aceita URLs livres.</p>
      </div>

      {message ? <p aria-live="polite" className={styles.feedback}>{message}</p> : null}

      <div className={styles.checks}>
        <CheckSection
          kind="routes"
          onRun={() => run("routes")}
          pending={isPending && runningKind === "routes"}
          result={selected.routes}
        />
        <CheckSection
          kind="apis"
          onRun={() => run("apis")}
          pending={isPending && runningKind === "apis"}
          result={selected.apis}
        />
      </div>
    </div>
  )
}

function CheckSection({
  kind,
  result,
  pending,
  onRun,
}: {
  readonly kind: HealthCheckKind
  readonly result: HealthCheckRunVM | null
  readonly pending: boolean
  readonly onRun: () => void
}) {
  const isRoutes = kind === "routes"
  return (
    <section className={styles.check}>
      <header className={styles.checkHeader}>
        <div>
          <p>{isRoutes ? "Páginas declaradas" : "Endpoints descobertos"}</p>
          <h2>{isRoutes ? "Route Check" : "API Check"}</h2>
          <small>{isRoutes
            ? "GET em todas as rotas publicadas pelos manifests."
            : "GET seguro ou OPTIONS de alcançabilidade, sem mutações."}</small>
        </div>
        <button disabled={pending} onClick={onRun} type="button">
          {pending ? "Testando…" : isRoutes ? "Testar rotas" : "Testar APIs"}
        </button>
      </header>

      {!result ? (
        <SurfaceState
          compact
          description="Execute o check para produzir o primeiro resultado deste ambiente."
          kind="empty"
          title="Ainda não executado"
        />
      ) : (
        <>
          <div className={styles.resultMeta}>
            <span>Última execução: {result.startedAtLabel}</span>
            <StatusLabel compact status={result.status}>
              {result.failureCount === 0 ? "Tudo operacional" : `${result.failureCount} falha(s)`}
            </StatusLabel>
          </div>
          <MetricStrip items={[
            { label: "Total", value: result.total, detail: "alvos encontrados", status: "available", icon: "layers" },
            { label: "Testadas", value: result.tested, detail: "execução completa", status: "available", icon: "activity" },
            { label: "OK", value: result.ok, detail: "respostas válidas", status: "complete", icon: "check" },
            { label: "Falhas", value: result.failureCount, detail: "pedem atenção", status: result.failureCount ? "attention" : "complete", icon: "warning" },
            { label: "Duração", value: result.durationLabel, detail: result.environment, status: "available", icon: "telemetry" },
          ]} />
          {result.persistenceWarning ? <p className={styles.warning}>{result.persistenceWarning}</p> : null}
          {result.failures.length === 0 ? (
            <SurfaceState compact description="Nenhum alvo falhou nesta execução." kind="empty" title="Sem falhas" />
          ) : (
            <div className={styles.failures}>
              <h3>Falhas encontradas</h3>
              {result.failures.map((failure) => (
                <article key={`${failure.appId}:${failure.route}`}>
                  <div>
                    <strong>{failure.project}</strong>
                    <code>{failure.method} {failure.route}</code>
                  </div>
                  <div>
                    <span>{failure.categoryLabel}</span>
                    <small>{failure.statusLabel} · {failure.durationLabel}</small>
                  </div>
                  <p>{failure.error}</p>
                  <a href={failure.url} rel="noreferrer" target="_blank">Abrir contexto</a>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
