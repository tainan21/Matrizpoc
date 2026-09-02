import { useEffect, useState } from "react"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { DoctorCheck, PortProcess, RuntimeInstance, SystemPulse, WorkspacePulse } from "../../domain/types"
import { UpdatePanel } from "./update-panel"

export type HomeTarget = "apps" | "git" | "agents" | "infra" | "doctor" | "terminal"

export function HomeView({ gateway, ports, open }: {
  gateway: DesktopGateway
  ports: readonly PortProcess[]
  open(target: HomeTarget): void
}) {
  const [runtimes, setRuntimes] = useState<readonly RuntimeInstance[]>()
  const [runtimeError, setRuntimeError] = useState(false)
  const [git, setGit] = useState<WorkspacePulse>()
  const [gitError, setGitError] = useState(false)
  const [checks, setChecks] = useState<readonly DoctorCheck[]>()
  const [doctorError, setDoctorError] = useState(false)
  const [system, setSystem] = useState<SystemPulse>()
  const [systemError, setSystemError] = useState(false)

  useEffect(() => {
    let active = true
    void gateway.runtimeSnapshot().then((value) => { if (active) setRuntimes(value) }).catch(() => { if (active) setRuntimeError(true) })
    void gateway.workspacePulse().then((value) => { if (active) setGit(value) }).catch(() => { if (active) setGitError(true) })
    void gateway.doctor().then((value) => { if (active) setChecks(value) }).catch(() => { if (active) setDoctorError(true) })
    void gateway.systemPulse().then((value) => { if (active) setSystem(value) }).catch(() => { if (active) setSystemError(true) })
    return () => { active = false }
  }, [gateway])

  const readyApps = runtimes?.filter(({ status }) => status === "ready").length ?? 0
  const readyChecks = checks?.filter(({ ok }) => ok).length ?? 0

  return <section className="home-view" aria-labelledby="home-title">
    <div className="home-heading">
      <div><span className="eyebrow">COMMAND CENTER / LOCAL</span><h1 id="home-title">INÍCIO</h1><p>Estado do workspace e próximos pontos de atenção.</p></div>
      <div className="home-quick-actions">
        <button aria-label="Abrir Apps" onClick={() => open("apps")}>ABRIR APPS</button>
        <button aria-label="Abrir Git" onClick={() => open("git")}>VER GIT</button>
        <button aria-label="Abrir Doctor" onClick={() => open("doctor")}>DOCTOR</button>
      </div>
    </div>

    <div className="home-status-strip" aria-label="Estado local">
      <Status label="GIT" value={gitError ? "Git indisponível" : git?.branch ?? "Verificando…"} detail={git ? `${git.changedFiles} mudanças` : undefined} tone={git?.clean ? "ready" : git ? "attention" : "neutral"} />
      <Status label="APPS" value={runtimeError ? "Apps indisponíveis" : runtimes ? `${readyApps}/${runtimes.length} ativos` : "Verificando…"} tone={runtimeError ? "attention" : readyApps ? "ready" : "neutral"} />
      <Status label="DOCTOR" value={doctorError ? "Doctor indisponível" : checks ? `${readyChecks}/${checks.length} checks prontos` : "Verificando…"} tone={checks?.every(({ ok }) => ok) ? "ready" : checks ? "attention" : "neutral"} />
      <Status label="SISTEMA" value={systemError ? "Pulso indisponível" : system ? `${Math.round(system.cpuUsage)}% CPU` : "Verificando…"} detail={system ? `${Math.round(system.usedMemoryBytes / 1e9)} GB RAM` : undefined} tone={system ? "ready" : systemError ? "attention" : "neutral"} />
    </div>

    <div className="home-workspace-grid">
      <section className="home-runtime-list" aria-labelledby="home-runtimes-title">
        <header><div><span className="eyebrow">WORKSPACE</span><h2 id="home-runtimes-title">APPS E PORTAS</h2></div><button aria-label="Abrir Apps" onClick={() => open("apps")}>GERENCIAR →</button></header>
        {ports.slice(0, 6).map((port) => <div className="home-runtime-row" key={`${port.port}-${port.pid}`}><span className={`status-dot ${port.state}`} /><strong>{port.processName}</strong><b>{port.port}</b><small>PID {port.pid}</small></div>)}
        {!ports.length ? <div className="home-empty">Nenhum listener observado.</div> : null}
      </section>

      <section className="home-next" aria-labelledby="home-next-title">
        <span className="eyebrow">PRÓXIMAS AÇÕES</span><h2 id="home-next-title">CONTINUAR TRABALHO</h2>
        <button aria-label="Abrir Agentes" onClick={() => open("agents")}><strong>Agentes e coworking</strong><span>→</span></button>
        <button aria-label="Abrir Infra" onClick={() => open("infra")}><strong>Infraestrutura local</strong><span>→</span></button>
        <button aria-label="Abrir Terminal" onClick={() => open("terminal")}><strong>Abrir terminal</strong><span>→</span></button>
      </section>
    </div>
    <UpdatePanel gateway={gateway} />
  </section>
}

function Status({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone: "ready" | "attention" | "neutral" }) {
  return <div className="home-status"><span className={`status-dot ${tone === "attention" ? "degraded" : tone}`} /><small>{label}</small><strong>{value}</strong>{detail ? <b>{detail}</b> : null}</div>
}
