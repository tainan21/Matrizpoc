import { useCallback, useEffect, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { DatabaseMigrationSnapshot, InfrastructureActionId, InfrastructureActionPreview, InfrastructureBackupRecord, InfrastructureServiceSnapshot, InfrastructureSnapshot, InfrastructureTargetId } from "../../domain/types"

export function InfrastructureView({ gateway }: { readonly gateway: DesktopGateway }) {
  const [snapshot, setSnapshot] = useState<InfrastructureSnapshot>()
  const [preview, setPreview] = useState<InfrastructureActionPreview>()
  const [logs, setLogs] = useState<{ name: string; lines: readonly string[] }>()
  const [migrations, setMigrations] = useState<DatabaseMigrationSnapshot>()
  const [backups, setBackups] = useState<readonly InfrastructureBackupRecord[]>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const refresh = useCallback(async () => {
    setError(undefined)
    try {
      setSnapshot(await gateway.infrastructureSnapshot())
    } catch (cause) {
      setError(message(cause, "Infraestrutura local indisponível"))
    }
  }, [gateway])

  useEffect(() => { void refresh() }, [refresh])

  const request = async (targetId: InfrastructureTargetId, actionId: InfrastructureActionId, backupId?: string) => {
    if (!snapshot || busy) return
    setBusy(true)
    setError(undefined)
    try {
      setPreview(await gateway.previewInfrastructureAction({ targetId, actionId, revision: snapshot.revision, ...(backupId ? { backupId } : {}) }))
    } catch (cause) {
      setError(message(cause, "Não foi possível preparar a operação"))
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!preview || busy) return
    setBusy(true)
    setError(undefined)
    try {
      const action = preview.actionId
      setSnapshot(await gateway.confirmInfrastructureAction(preview.confirmationToken))
      if (action === "backup") setBackups(await gateway.infrastructureBackups())
      setPreview(undefined)
    } catch (cause) {
      setError(message(cause, "A operação de infraestrutura falhou"))
      setPreview(undefined)
    } finally {
      setBusy(false)
    }
  }

  const inspectLogs = async (service: InfrastructureServiceSnapshot) => {
    setError(undefined)
    try {
      setLogs({ name: service.displayName, lines: await gateway.infrastructureLogs(service.id) })
    } catch (cause) {
      setError(message(cause, "Logs indisponíveis"))
    }
  }

  const inspectMigrations = async () => {
    setError(undefined)
    try {
      setMigrations(await gateway.infrastructureMigrations())
    } catch (cause) {
      setError(message(cause, "Ledger de migrations indisponível"))
    }
  }

  return (
    <section className="infra-view" aria-labelledby="infra-title">
      <div className="section-head">
        <div><span className="eyebrow">LOCAL / PORTÁTIL</span><h1 id="infra-title">INFRA</h1><p>PostgreSQL, Garnet e NATS sob autoridade nativa, sem Serviços Windows.</p></div>
        <button className="round-action" aria-label="Atualizar Infra" disabled={busy} onClick={() => void refresh()}>↻</button>
      </div>

      <div className="infra-summary">
        <div><small>STACK</small><strong>{snapshot ? overallState(snapshot) : "VERIFICANDO"}</strong></div>
        <div><small>DIRETÓRIO GERENCIADO</small><code>{snapshot?.root ?? "—"}</code></div>
        {snapshot && !snapshot.services.some(({ state }) => state === "external_unowned") ? <div className="infra-stack-actions">
          {snapshot.services.some(({ state }) => state === "not_installed") ? <button disabled={busy} aria-label="Instalar stack portátil" onClick={() => void request("stack", "install")}>INSTALAR STACK</button> : <button disabled={busy} aria-label="Iniciar stack portátil" onClick={() => void request("stack", "start")}>INICIAR STACK</button>}
        </div> : null}
      </div>

      <div className="infra-database-actions"><button aria-label="Inspecionar migrations" onClick={() => void inspectMigrations()}>MIGRATIONS</button></div>

      {error ? <p className="infra-error" role="alert">{error}</p> : null}
      <div className="infra-grid">
        {snapshot?.services.map((service) => (
          <article className="infra-card" key={service.id}>
            <header><div><small>{service.id.toUpperCase()}</small><h2>{service.displayName}</h2></div><span className={`infra-badge ${service.state}`}>{service.state.replaceAll("_", " ")}</span></header>
            <p>{service.message}</p>
            <dl><div><dt>VERSÃO</dt><dd>{service.version}</dd></div><div><dt>PORTAS</dt><dd>{service.ports.join(" / ")}</dd></div></dl>
            <div className="infra-actions">
              {actionsFor(service).map(({ id, label }) => <button key={id} disabled={busy} aria-label={`${label} ${service.displayName}`} onClick={() => void request(service.id, id)}>{label.toUpperCase()}</button>)}
              <button aria-label={`Inspecionar logs do ${service.displayName}`} onClick={() => void inspectLogs(service)}>LOGS</button>
            </div>
          </article>
        ))}
      </div>

      {preview ? <div className="infra-confirm" role="dialog" aria-label="Confirmar operação de infraestrutura"><div><small>PRÉVIA OBRIGATÓRIA</small><h2>{preview.title}</h2>{preview.impact.map((item) => <p key={item}>{item}</p>)}</div><div><button disabled={busy} onClick={() => setPreview(undefined)}>CANCELAR</button><button disabled={busy} aria-label="Confirmar operação" onClick={() => void confirm()}>CONFIRMAR</button></div></div> : null}
      {logs ? <section className="infra-logs" aria-label={`Logs do ${logs.name}`}><header><strong>LOGS / {logs.name.toUpperCase()}</strong><button aria-label="Fechar logs" onClick={() => setLogs(undefined)}>×</button></header><pre>{logs.lines.join("\n") || "Nenhum log local disponível"}</pre></section> : null}
      {migrations ? <section className="infra-migrations" aria-label="Ledger de migrations"><header><strong>MIGRATIONS / {migrations.state.toUpperCase()}</strong><button aria-label="Fechar migrations" onClick={() => setMigrations(undefined)}>×</button></header><div>{migrations.schemas.map(({ schema, ledger }) => <article key={schema}><strong>{schema}</strong><span className={`infra-badge ${ledger.state}`}>{ledger.state}</span>{ledger.pending.map((name) => <code key={`pending-${name}`}>{name}</code>)}{ledger.altered.map((name) => <code key={`altered-${name}`}>ALTERADA · {name}</code>)}{ledger.unexpected.map((name) => <code key={`unexpected-${name}`}>INESPERADA · {name}</code>)}{ledger.failed.map((name) => <code key={`failed-${name}`}>FALHOU · {name}</code>)}</article>)}</div></section> : null}
      {backups ? <section className="infra-backups" aria-label="Catálogo de backups"><header><strong>BACKUPS VERIFICADOS</strong><button aria-label="Fechar backups" onClick={() => setBackups(undefined)}>×</button></header>{backups.map((backup) => <article key={backup.id}><code>{backup.id}</code><span>{formatBytes(backup.bytes)}</span><b className={`infra-badge ${backup.integrity}`}>{backup.integrity}</b>{backup.integrity === "verified" ? <button disabled={busy} aria-label={`Restaurar ${backup.id}`} onClick={() => void request("postgres", "restore", backup.id)}>RESTAURAR</button> : null}</article>)}</section> : null}
      <p className="area-note">Portas externas nunca são encerradas. Toda mutação exige prévia, token de uso único e nova inspeção.</p>
    </section>
  )
}

function actionsFor(service: InfrastructureServiceSnapshot): readonly { id: InfrastructureActionId; label: string }[] {
  if (service.state === "external_unowned") return []
  if (service.state === "not_installed") return [{ id: "install", label: "Instalar" }]
  if (service.state === "healthy" || service.state === "degraded") return [
    ...(service.id === "postgres" && service.state === "healthy" ? [{ id: "provision" as const, label: "Preparar banco" }, { id: "backup" as const, label: "Criar backup" }] : []),
    { id: "restart", label: "Reiniciar" },
    { id: "stop", label: "Parar" },
  ]
  return [{ id: "start", label: "Iniciar" }]
}

function overallState(snapshot: InfrastructureSnapshot) {
  if (snapshot.services.every(({ state }) => state === "healthy")) return "SAUDÁVEL"
  if (snapshot.services.some(({ state }) => state === "external_unowned")) return "ATENÇÃO"
  if (snapshot.services.every(({ state }) => state === "not_installed")) return "NÃO INSTALADA"
  return "PARCIAL"
}

function message(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
