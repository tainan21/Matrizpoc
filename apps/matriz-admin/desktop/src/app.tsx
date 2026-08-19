import { useState } from "react"

import type { SeumeiDesktopSnapshot } from "../../src/ui/presenters/desktop.presenter"

type View = "pulse" | "establishments" | "owners" | "settings"
type SoundId = "navigation" | "interaction"

const NAV: readonly { id: View; label: string; glyph: string }[] = [
  { id: "pulse", label: "Visão geral", glyph: "⌁" },
  { id: "establishments", label: "Estabelecimentos", glyph: "◇" },
  { id: "owners", label: "Proprietários", glyph: "◎" },
  { id: "settings", label: "Ajustes", glyph: "⊹" },
]

export function SeumeiDesktopApp({
  snapshot,
  play,
}: {
  readonly snapshot: SeumeiDesktopSnapshot
  readonly play: (id: SoundId) => unknown
}) {
  const [view, setView] = useState<View>("pulse")
  const [sounds, setSounds] = useState(true)
  const select = (next: View) => {
    setView(next)
    if (sounds) void play("navigation")
  }

  return (
    <div className="seumei-shell" data-matrizlib="0.1.0" data-theme="dark">
      <header className="seumei-titlebar" data-tauri-drag-region>
        <span className="seumei-mark" aria-hidden="true">S</span>
        <strong data-tauri-drag-region>SEUMEI</strong>
        <span className="runtime-pill"><i />LOCAL</span>
        <WindowButtons />
      </header>

      <aside className="seumei-rail">
        <div className="rail-index"><small>OP / 01</small><b>OPERAÇÃO</b></div>
        <nav aria-label="Seumei">
          {NAV.map((item) => <button key={item.id} type="button" aria-label={item.label} aria-current={view === item.id ? "page" : undefined} onClick={() => select(item.id)}><span aria-hidden="true">{item.glyph}</span><b>{item.label}</b></button>)}
        </nav>
        <div className="rail-state"><i /><span>SYNC</span><b>LOCAL</b></div>
      </aside>

      <main className="seumei-main">
        {view === "pulse" ? <Pulse snapshot={snapshot} /> : null}
        {view === "establishments" ? <Establishments snapshot={snapshot} /> : null}
        {view === "owners" ? <Owners snapshot={snapshot} /> : null}
        {view === "settings" ? <Settings sounds={sounds} setSounds={(enabled) => { setSounds(enabled); if (enabled) void play("interaction") }} /> : null}
      </main>
      <footer className="seumei-status"><span>SEUMEI / DESKTOP</span><b>{new Date().getFullYear()}</b><span>v0.1.0</span></footer>
    </div>
  )
}

function WindowButtons() {
  const action = async (kind: "minimize" | "close") => {
    if (!("__TAURI_INTERNALS__" in window)) return
    const { getCurrentWindow } = await import("@tauri-apps/api/window")
    const current = getCurrentWindow()
    if (kind === "minimize") await current.minimize()
    else await current.close()
  }
  return <div className="window-buttons"><button aria-label="Minimizar" onClick={() => void action("minimize")}>−</button><button aria-label="Fechar" onClick={() => void action("close")}>×</button></div>
}

function Heading({ code, title, count }: { code: string; title: string; count?: number }) {
  return <div className="view-heading"><div><span>{code}</span><h1>{title}</h1></div>{count === undefined ? null : <strong>{count.toString().padStart(2, "0")}</strong>}</div>
}

function Pulse({ snapshot }: { snapshot: SeumeiDesktopSnapshot }) {
  return <section><Heading code="AGORA / LOCAL" title="PULSO" /><div className="metric-strip"><Metric label="ESPAÇOS" value={snapshot.metrics.establishments} /><Metric label="ATIVOS" value={snapshot.metrics.active} tone /><Metric label="SERVIÇOS" value={snapshot.metrics.offerings} /></div><div className="pulse-grid"><article className="signal-card"><span>OPERAÇÃO</span><strong>{snapshot.metrics.active === snapshot.metrics.establishments ? "ESTÁVEL" : "ATENÇÃO"}</strong><div className="signal-line"><i /><i /><i /><i /></div><small>{snapshot.metrics.active}/{snapshot.metrics.establishments} ONLINE</small></article><article className="next-card"><span>EM FOCO</span>{snapshot.establishments.slice(0, 2).map((item, index) => <div key={item.id}><b>{String(index + 1).padStart(2, "0")}</b><strong>{item.name}</strong><small>{item.city} · {item.statusLabel}</small></div>)}</article></div></section>
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: boolean }) {
  return <article className={tone ? "metric is-live" : "metric"}><span>{label}</span><strong>{value.toString().padStart(2, "0")}</strong><i /></article>
}

function Establishments({ snapshot }: { snapshot: SeumeiDesktopSnapshot }) {
  return <section><Heading code="INVENTÁRIO / LOCAL" title="ESPAÇOS" count={snapshot.establishments.length} /><div className="entity-list">{snapshot.establishments.map((item, index) => <article key={item.id}><b>{String(index + 1).padStart(2, "0")}</b><div><strong>{item.name}</strong><small>{item.type.toUpperCase()} · {item.city}</small></div><span>{item.serviceRadiusDisplay}</span><i className={`tone-${item.statusTone}`}>{item.statusLabel}</i></article>)}</div></section>
}

function Owners({ snapshot }: { snapshot: SeumeiDesktopSnapshot }) {
  return <section><Heading code="REDE / LOCAL" title="PESSOAS" count={snapshot.owners.length} /><div className="owner-grid">{snapshot.owners.map((owner) => <article key={owner.id}><span>{owner.ownerName.slice(0, 1)}</span><div><strong>{owner.ownerName}</strong><small>{owner.establishmentName} · {owner.establishmentLocation}</small></div><a href={`mailto:${owner.email}`}>{owner.email}</a><p>{owner.bio}</p></article>)}</div></section>
}

function Settings({ sounds, setSounds }: { sounds: boolean; setSounds(value: boolean): void }) {
  return <section><Heading code="PREFERÊNCIAS / DEVICE" title="AJUSTES" /><div className="setting-list"><label><span><b>Feedback sonoro</b><small>Matriz Sound System</small></span><input type="checkbox" checked={sounds} onChange={(event) => setSounds(event.target.checked)} /></label><div><span><b>Armazenamento</b><small>Persistente neste dispositivo</small></span><strong>LOCAL</strong></div><div><span><b>Conexão</b><small>Sem dependência do Hub</small></span><strong>OFFLINE</strong></div></div></section>
}
