"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import type { DesktopCommand } from "../../domain/desktop-bridge"
import type { InfrastructureActionId, InfrastructureActionPreview, InfrastructureServiceId, InfrastructureSnapshot } from "../../modules/infrastructure/domain/infrastructure"
import type { InfrastructureInventoryViewModel } from "./infrastructure-presenter"
import type { DatabaseBackupSnapshot, DatabaseRecoveryAction, DatabaseRecoveryPreview } from "../../modules/infrastructure/application/database-recovery-manager"
import type { MigrationGateStatus } from "../../modules/infrastructure/application/database-migration-gate"
import type { LocalDevelopmentSeedPreview, LocalDevelopmentSeedResult } from "../../modules/infrastructure/application/local-development-seed-manager"

const tabs = ["Overview", "Database", "Cache", "Events", "Backups", "Migrations", "Contracts", "Logs"] as const
type Tab = typeof tabs[number]

export function InfrastructureCockpit({ inventory }: { inventory: InfrastructureInventoryViewModel }) {
  const [tab, setTab] = useState<Tab>("Overview")
  const [snapshot, setSnapshot] = useState<InfrastructureSnapshot | null>(null)
  const [preview, setPreview] = useState<InfrastructureActionPreview | null>(null)
  const [recoveryPreview, setRecoveryPreview] = useState<DatabaseRecoveryPreview | null>(null)
  const [backups, setBackups] = useState<readonly DatabaseBackupSnapshot[]>([])
  const [migrations, setMigrations] = useState<readonly MigrationGateStatus[]>([])
  const [seedPreview, setSeedPreview] = useState<LocalDevelopmentSeedPreview | null>(null)
  const [logs, setLogs] = useState<readonly string[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [bridge, setBridge] = useState<{ invoke(command: DesktopCommand): Promise<unknown> } | undefined>()
  const refresh = useCallback(async () => { if (bridge) try { setSnapshot(await bridge.invoke({ type: "infrastructure.status" }) as InfrastructureSnapshot); setMessage(null) } catch { setMessage("Não foi possível consultar o host Windows.") } }, [bridge])
  useEffect(() => { setBridge(window.matrizDesktop) }, [])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { if (bridge && tab === "Backups") void bridge.invoke({ type: "infrastructure.database.backups" }).then((value) => setBackups(value as readonly DatabaseBackupSnapshot[])).catch(() => setMessage("Não foi possível ler o catálogo de backups.")) }, [bridge, tab])
  useEffect(() => { if (bridge && tab === "Migrations") void bridge.invoke({ type: "infrastructure.database.migrations" }).then((value) => setMigrations(value as readonly MigrationGateStatus[])).catch(() => setMessage("Não foi possível ler os ledgers de migrations.")) }, [bridge, tab])

  async function request(serviceId: "stack" | InfrastructureServiceId, actionId: InfrastructureActionId) {
    if (!bridge) return
    try { setPreview(await bridge.invoke({ type: "infrastructure.action.preview", serviceId, actionId }) as InfrastructureActionPreview); setMessage(null) }
    catch (error) { setMessage(error instanceof Error ? error.message : "Operação recusada") }
  }
  async function confirm() {
    if (!bridge || !preview) return
    try { setSnapshot(await bridge.invoke({ type: "infrastructure.action.confirm", confirmationToken: preview.confirmationToken }) as InfrastructureSnapshot); setPreview(null); setMessage("Operação concluída e estado relido do Windows.") }
    catch (error) { setPreview(null); setMessage(error instanceof Error ? error.message : "Operação recusada") }
  }
  async function loadLogs(serviceId: InfrastructureServiceId) { if (bridge) { setLogs(await bridge.invoke({ type: "infrastructure.logs", serviceId }) as readonly string[]); setTab("Logs") } }
  async function requestRecovery(actionId: DatabaseRecoveryAction, backupId: string | null = null) {
    if (!bridge) return
    try { setRecoveryPreview(await bridge.invoke({ type: "infrastructure.database.recovery.preview", actionId, backupId }) as DatabaseRecoveryPreview); setMessage(null) }
    catch (error) { setMessage(error instanceof Error ? error.message : "Operação de recuperação recusada") }
  }
  async function confirmRecovery() {
    if (!bridge || !recoveryPreview) return
    try { setBackups(await bridge.invoke({ type: "infrastructure.database.recovery.confirm", confirmationToken: recoveryPreview.confirmationToken }) as readonly DatabaseBackupSnapshot[]); setRecoveryPreview(null); setMessage("Operação de recuperação concluída e catálogo validado novamente.") }
    catch (error) { setRecoveryPreview(null); setMessage(error instanceof Error ? error.message : "Operação de recuperação recusada") }
  }
  async function requestSeed() {
    if (!bridge) return
    try { setSeedPreview(await bridge.invoke({ type: "infrastructure.local.seed.preview" }) as LocalDevelopmentSeedPreview); setMessage(null) }
    catch (error) { setMessage(error instanceof Error ? error.message : "Seed local recusado") }
  }
  async function confirmSeed() {
    if (!bridge || !seedPreview) return
    try {
      const result = await bridge.invoke({ type: "infrastructure.local.seed.confirm", confirmationToken: seedPreview.confirmationToken }) as LocalDevelopmentSeedResult
      setSeedPreview(null)
      setMessage(result.message)
    }
    catch (error) { setSeedPreview(null); setMessage(error instanceof Error ? error.message : "Seed local recusado") }
  }

  return <>
    <nav className="infra-tabs" aria-label="Áreas da infraestrutura">{tabs.map((item) => <button type="button" key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {!bridge ? <section className="desktop-only-notice"><span>WEB · SOMENTE LEITURA</span><h2>Operações nativas exigem o Matriz Control Desktop</h2><p>Os contratos continuam visíveis; instalar, iniciar, parar e reiniciar não são expostos pelo servidor web.</p></section> : null}
    {message ? <p className="infra-message" role="status">{message}</p> : null}
    {tab === "Overview" ? <>
      <section className="operation-grid" aria-label="Resumo operacional">{(snapshot?.services ?? []).map((service) => <article className="operation-card" key={service.id}><span>{service.serviceName}</span><strong>{service.state}</strong><p>{service.host}:{service.ports.join(" / ")} · {service.version}</p><div className="infra-actions"><button onClick={() => request(service.id, "start")}>Iniciar</button><button onClick={() => request(service.id, "stop")}>Parar</button><button onClick={() => request(service.id, "restart")}>Reiniciar</button><button onClick={() => loadLogs(service.id)}>Logs</button></div></article>)}</section>
      {bridge && (!snapshot || snapshot.services.every((service) => service.state === "not_installed")) ? <button className="infra-primary" onClick={() => request("stack", "install")}>Instalar stack Matriz</button> : null}
      {bridge && snapshot ? <div className="infra-stack-actions"><button onClick={() => request("stack", "start")}>Iniciar stack</button><button onClick={() => request("stack", "stop")}>Parar stack</button><button onClick={() => request("stack", "restart")}>Reiniciar stack</button><button onClick={refresh}>Atualizar status</button></div> : null}
    </> : null}
    {tab === "Database" ? <Panel title="Database"><p>PostgreSQL 17 dedicado em <code>127.0.0.1:55432</code>. O listener externo em <code>5432</code> é sempre não gerenciado.</p>{bridge ? <button className="infra-primary" onClick={requestSeed}>Popular ambiente local</button> : null}</Panel> : null}
    {tab === "Cache" ? <Panel title="Cache"><p>Garnet 2.1.5 em <code>127.0.0.1:46379</code>. Credenciais e namespaces entram no gate de Identity/Secrets.</p></Panel> : null}
    {tab === "Events" ? <Panel title="Events"><p>NATS 2.14.5 com JetStream em <code>54222</code> e monitoramento local em <code>58222</code>.</p></Panel> : null}
    {tab === "Backups" ? <Panel title="Backups e recuperação"><p>Backups lógicos validados do database <code>matriz</code>. Restore usa database temporário e mantém a base anterior em quarentena.</p>{bridge ? <button className="infra-primary" onClick={() => requestRecovery("backup")}>Criar backup de guarda</button> : null}<div className="operation-table" aria-label="Catálogo de backups">{backups.map((backup) => <article key={backup.id}><span><b>{backup.id}</b><small>{backup.kind} · {new Date(backup.createdAt).toLocaleString("pt-BR")}</small></span><span><code>{backup.valid ? "válido" : "inválido"}</code><small>{backup.bytes.toLocaleString("pt-BR")} bytes · SHA-256 {backup.sha256.slice(0, 12)}…</small></span>{bridge && backup.valid ? <span className="infra-actions"><button onClick={() => requestRecovery("restore", backup.id)}>Restaurar</button><button className="danger-button" onClick={() => requestRecovery("recreate", backup.id)}>Recriar</button></span> : null}</article>)}</div>{!backups.length ? <p className="muted">Nenhum backup catalogado.</p> : null}</Panel> : null}
    {tab === "Migrations" ? <Panel title="Migrations"><p>Runtime nunca executa migration. Qualquer estado diferente de <code>clean</code> bloqueia o start do app antes de abrir portas ou processos.</p><div className="operation-table" aria-label="Ledgers de migrations">{migrations.map((ledger) => <article key={ledger.schema}><span><b>{ledger.schema}</b><small>{ledger.state}</small></span><span><code>{ledger.pending.length} pendentes</code><small>{ledger.altered.length} alteradas · {ledger.unexpected.length} inesperadas · {ledger.failed.length} falhas</small></span></article>)}</div>{!migrations.length ? <p className="muted">Nenhum ledger disponível.</p> : null}</Panel> : null}
    {tab === "Contracts" ? <section className="operation-table" aria-label="Infrastructure Contracts">{inventory.apps.map((app) => <article key={app.appId}><span><b>{app.appId}</b><small>{app.classification} · {app.runtime}</small></span><span><code>{app.database}</code><small>{app.identity} · {app.cache}</small></span><span><small>{app.events}</small><small>{app.secrets}</small></span></article>)}</section> : null}
    {tab === "Logs" ? <Panel title="Logs sanitizados"><pre className="infra-logs">{logs.length ? logs.join("\n") : "Selecione Logs em um serviço. No máximo 200 linhas são exibidas."}</pre></Panel> : null}
    {preview ? <div className="infra-confirm" role="dialog" aria-modal="true" aria-label="Confirmar operação de infraestrutura"><div><span>CONFIRMAÇÃO DE USO ÚNICO</span><h2>{preview.title}</h2>{preview.impact.map((line) => <p key={line}>{line}</p>)}<div className="infra-actions"><button onClick={() => setPreview(null)}>Cancelar</button><button className="danger-button" onClick={confirm}>Confirmar agora</button></div></div></div> : null}
    {recoveryPreview ? <div className="infra-confirm" role="dialog" aria-modal="true" aria-label="Confirmar recuperação do database"><div><span>RECUPERAÇÃO · TOKEN DE USO ÚNICO</span><h2>{recoveryPreview.title}</h2>{recoveryPreview.impact.map((line) => <p key={line}>{line}</p>)}<div className="infra-actions"><button onClick={() => setRecoveryPreview(null)}>Cancelar</button><button className="danger-button" onClick={confirmRecovery}>Confirmar agora</button></div></div></div> : null}
    {seedPreview ? <div className="infra-confirm" role="dialog" aria-modal="true" aria-label="Confirmar seed local"><div><span>SEED LOCAL · TOKEN DE USO ÚNICO</span><h2>{seedPreview.title}</h2>{seedPreview.impact.map((line) => <p key={line}>{line}</p>)}<div className="infra-actions"><button onClick={() => setSeedPreview(null)}>Cancelar</button><button className="danger-button" onClick={confirmSeed}>Popular agora</button></div></div></div> : null}
  </>
}

function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className="desktop-only-notice"><span>INFRAESTRUTURA V1</span><h2>{title}</h2>{children}</section> }
