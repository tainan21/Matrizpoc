import { Badge, Button } from "@matriz/design-ui/primitives"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type {
  DesktopAppId,
  HubFeatureId,
  NodeSweepDeletion,
  NodeSweepScan,
  ResumeSession,
  SystemPulse,
} from "../../domain/types"

const PULSE_INTERVAL_MS = 1_500

function formatBytes(value?: number): string {
  if (value === undefined) return "—"
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(0)} MB`
  return `${(value / 1_000_000_000).toFixed(1)} GB`
}

function formatUptime(seconds?: number): string {
  if (seconds === undefined) return "—"
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  return days ? `${days}d ${hours}h` : `${hours}h ${minutes}m`
}

function formatLastUsed(timestamp: number): string {
  const elapsed = Math.max(0, Date.now() - timestamp)
  const days = Math.floor(elapsed / 86_400_000)
  if (days) return `${days} ${days === 1 ? "dia" : "dias"} atrás`
  const hours = Math.floor(elapsed / 3_600_000)
  if (hours) return `${hours}h atrás`
  return `${Math.max(1, Math.floor(elapsed / 60_000))} min atrás`
}

function PulseItem({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="pulse-item"><small>{label}</small><strong>{value}</strong>{detail ? <span>{detail}</span> : null}</div>
}

export function HubView({ gateway, onResume, focusFeature }: {
  gateway: DesktopGateway
  onResume(session: ResumeSession): void
  focusFeature?: HubFeatureId
}) {
  const [pulse, setPulse] = useState<SystemPulse>()
  const [pulseError, setPulseError] = useState(false)
  const [awake, setAwakeState] = useState(false)
  const [awakeBusy, setAwakeBusy] = useState(false)
  const [awakeError, setAwakeError] = useState("")
  const [scan, setScan] = useState<NodeSweepScan>()
  const [scanBusy, setScanBusy] = useState(false)
  const [scanError, setScanError] = useState("")
  const [selected, setSelected] = useState<ReadonlySet<DesktopAppId>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletion, setDeletion] = useState<NodeSweepDeletion>()
  const [resume, setResume] = useState<ResumeSession>()
  const refs = useRef<Partial<Record<HubFeatureId, HTMLElement | null>>>({})
  const pulseInFlight = useRef(false)

  const refreshPulse = useCallback(async () => {
    try {
      if (!gateway.systemPulse || pulseInFlight.current) return
      pulseInFlight.current = true
      setPulse(await gateway.systemPulse())
      setPulseError(false)
    } catch {
      setPulseError(true)
    } finally {
      pulseInFlight.current = false
    }
  }, [gateway])

  useEffect(() => {
    void refreshPulse()
    const interval = window.setInterval(() => void refreshPulse(), PULSE_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [refreshPulse])

  useEffect(() => {
    if (gateway.getAwakeState) void gateway.getAwakeState().then(setAwakeState).catch(() => setAwakeError("Estado indisponível"))
    if (gateway.readResumeSession) void gateway.readResumeSession().then((state) => setResume(state.resume)).catch(() => setResume(undefined))
  }, [gateway])

  useEffect(() => {
    if (!focusFeature) return
    window.requestAnimationFrame(() => refs.current[focusFeature]?.focus())
  }, [focusFeature])

  const toggleAwake = async (enabled: boolean) => {
    const previous = awake
    setAwakeState(enabled)
    setAwakeBusy(true)
    setAwakeError("")
    try {
      setAwakeState(await gateway.setAwake(enabled))
    } catch (error) {
      setAwakeState(previous)
      setAwakeError(error instanceof Error ? error.message : "Não foi possível alterar Awake")
    } finally {
      setAwakeBusy(false)
    }
  }

  const runScan = async () => {
    setScanBusy(true)
    setScanError("")
    setDeletion(undefined)
    setSelected(new Set())
    setConfirmDelete(false)
    try {
      setScan(await gateway.scanNodeModules())
    } catch (error) {
      setScan(undefined)
      setScanError(error instanceof Error ? error.message : "Falha ao verificar projetos")
    } finally {
      setScanBusy(false)
    }
  }

  const toggleCandidate = (appId: DesktopAppId) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(appId)) next.delete(appId)
      else next.add(appId)
      return next
    })
    setConfirmDelete(false)
  }

  const deleteSelected = async () => {
    if (!scan || !selected.size) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setScanBusy(true)
    setScanError("")
    try {
      const result = await gateway.deleteNodeModules({ scanId: scan.scanId, appIds: [...selected] })
      setDeletion(result)
      const deleted = new Set(result.results.filter((item) => item.deleted).map((item) => item.appId))
      setScan({
        ...scan,
        candidates: scan.candidates.filter((item) => !deleted.has(item.appId)),
        potentialBytes: scan.candidates.filter((item) => !deleted.has(item.appId)).reduce((total, item) => total + item.sizeBytes, 0),
      })
      setSelected(new Set())
      setConfirmDelete(false)
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Falha ao limpar projetos")
    } finally {
      setScanBusy(false)
    }
  }

  const selectedBytes = useMemo(() => scan?.candidates
    .filter(({ appId }) => selected.has(appId))
    .reduce((total, candidate) => total + candidate.sizeBytes, 0) ?? 0, [scan, selected])

  return (
    <section className="hub-view" aria-labelledby="hub-title">
      <div className="hub-heading"><div><span className="eyebrow">SISTEMA / UTILIDADES</span><h1 id="hub-title">MATRIZ HUB</h1><p>Ferramentas locais para manter sua máquina e seus projetos prontos para trabalhar.</p></div></div>

      <article className="hub-pulse" tabIndex={-1} ref={(node) => { refs.current["system-pulse"] = node }}>
        <div className="hub-card-title"><strong>SYSTEM PULSE</strong>{pulseError ? <Badge tone="warning">RETRYING</Badge> : <span className="status-dot ready" />}</div>
        <div className="pulse-grid">
          <PulseItem label="CPU" value={pulse ? `${Math.round(pulse.cpuUsage)}%` : "—"} detail={pulse?.cpuModel} />
          <PulseItem label="RAM" value={pulse ? `${formatBytes(pulse.usedMemoryBytes)} / ${formatBytes(pulse.totalMemoryBytes)}` : "—"} detail={pulse ? `${formatBytes(pulse.availableMemoryBytes)} disponíveis` : undefined} />
          <PulseItem label="TEMP" value={pulse?.temperatureCelsius == null ? "Unavailable" : `${Math.round(pulse.temperatureCelsius)}°C`} />
          <PulseItem label="DISCO" value={pulse?.diskFreeBytes === undefined ? "—" : `${formatBytes(pulse.diskFreeBytes)} livres`} detail={pulse?.diskUsedBytes === undefined ? undefined : `${formatBytes(pulse.diskUsedBytes)} usados`} />
          <PulseItem label="UPTIME" value={formatUptime(pulse?.uptimeSeconds)} />
          <PulseItem label="PROCESSOS" value={pulse?.processCount.toString() ?? "—"} />
          <PulseItem label="WINDOWS" value={pulse?.windowsVersion ?? "—"} detail={pulse?.hostname} />
        </div>
      </article>

      <div className="hub-main-grid">
        <article className="hub-card node-sweep" tabIndex={-1} ref={(node) => { refs.current["node-sweep"] = node }}>
          <div className="hub-card-title"><div><span className="hub-glyph">◇</span><div><h2>NODE SWEEP</h2><p>Dependências antigas de projetos registrados no Control.</p></div></div><Badge tone="neutral">SAFE</Badge></div>
          <div className="sweep-summary"><strong>{scan ? `${scan.candidates.length} candidatos` : "Aguardando verificação"}</strong>{scan ? <span>{formatBytes(scan.potentialBytes)} recuperáveis</span> : null}</div>
          <div className="sweep-list">
            {scan?.candidates.map((candidate) => <label className="sweep-row" key={candidate.appId}>
              <input type="checkbox" aria-label={`Selecionar ${candidate.projectName}`} checked={selected.has(candidate.appId)} onChange={() => toggleCandidate(candidate.appId)} />
              <span><strong>{candidate.projectName}</strong><small>{candidate.path}</small></span>
              <span><b>{formatBytes(candidate.sizeBytes)}</b><small>{candidate.packageManager ?? "desconhecido"} · {formatLastUsed(candidate.lastUsedAt)}</small></span>
            </label>)}
            {scan && !scan.candidates.length ? <div className="hub-empty"><strong>Everything is clean</strong><span>Nenhum node_modules está elegível há cinco dias.</span></div> : null}
          </div>
          {scanError ? <p className="hub-error" role="alert">{scanError}</p> : null}
          {deletion?.results.map((result) => <p className={result.deleted ? "hub-success" : "hub-error"} key={result.appId}>{result.deleted ? `${result.appId}: ${formatBytes(result.recoveredBytes)} recuperados` : `${result.appId}: ${result.error}`}</p>)}
          <div className="hub-actions"><Button variant="secondary" disabled={scanBusy} onClick={() => void runScan()}>{scanBusy ? "VERIFICANDO…" : "VERIFICAR AGORA"}</Button><Button aria-label={confirmDelete ? "CONFIRMAR LIMPEZA" : "LIMPAR SELECIONADOS"} className="danger-button" variant={confirmDelete ? "primary" : "secondary"} disabled={!selected.size || scanBusy} onClick={() => void deleteSelected()}>{confirmDelete ? "CONFIRMAR LIMPEZA" : "LIMPAR SELECIONADOS"}{selectedBytes ? ` · ${formatBytes(selectedBytes)}` : ""}</Button></div>
          <footer>Somente apps registrados no workspace atual.</footer>
        </article>

        <div className="hub-side">
          <article className="hub-card awake-card" tabIndex={-1} ref={(node) => { refs.current["matriz-awake"] = node }}>
            <div className="hub-card-title"><div><span className="hub-glyph">☾</span><div><h2>MATRIZ AWAKE</h2><Badge tone={awake ? "success" : "neutral"}>AWAKE: {awake ? "ON" : "OFF"}</Badge></div></div><label className="awake-toggle"><span>{awake ? "ON" : "OFF"}</span><input type="checkbox" aria-label="Keep PC Awake" checked={awake} disabled={awakeBusy} onChange={(event) => void toggleAwake(event.target.checked)} /></label></div>
            <p>Evita suspensão automática enquanto o Matriz Control permanece ativo. Não altera o plano de energia.</p>
            {awakeError ? <p className="hub-error" role="alert">{awakeError}</p> : null}
          </article>

          <article className="hub-card resume-card" tabIndex={-1} ref={(node) => { refs.current["resume-session"] = node }}>
            <div className="hub-card-title"><div><span className="hub-glyph">›_</span><div><h2>CONTINUAR SESSÃO</h2><p>Retome apenas o contexto local da interface.</p></div></div></div>
            {resume ? <><dl><div><dt>Área</dt><dd>{resume.area}</dd></div>{resume.appId ? <div><dt>App</dt><dd>{resume.appId}</dd></div> : null}{resume.terminalCwd ? <div><dt>Terminal</dt><dd>{resume.terminalCwd}</dd></div> : null}<div><dt>Última atividade</dt><dd>{formatLastUsed(resume.updatedAt)}</dd></div></dl><Button variant="primary" onClick={() => onResume(resume)}>RETOMAR</Button><small>Nenhum comando ou processo será executado automaticamente.</small></> : <div className="hub-empty"><strong>Nenhuma sessão anterior</strong><span>Seu próximo contexto de trabalho aparecerá aqui.</span></div>}
          </article>
        </div>
      </div>
    </section>
  )
}
