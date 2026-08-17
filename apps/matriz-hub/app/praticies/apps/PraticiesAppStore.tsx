"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  DEFAULT_PRACTICE_APPS,
  PraticiesService,
  createDefaultPraticiesState,
  createStoredPraticiesRepository,
  reorderLayout,
  type PracticeAppKind,
  type PracticeIconKey,
} from "@matriz/flows-praticies"
import type { CapabilityPracticiesResponseDTO } from "@matriz/integration-api-contracts"
import { createDefaultStore } from "@matriz/platform-storage"
import { toPracticeWorkspaceVM, type PracticeAppVM, type PracticeWorkspaceVM } from "../../../src/domains/praticies/presentation/apps-presenter"
import styles from "./apps.module.css"

type Filter = "all" | PracticeAppKind

const practiceIcons: Record<PracticeIconKey, string> = { folders: "▦", checklist: "✓", compass: "⌖", note: "≡", spark: "✦", timer: "◷" }
function PracticeIcon({ iconKey }: { iconKey: PracticeIconKey }) { return <>{practiceIcons[iconKey]}</> }

function service() {
  return new PraticiesService(
    createStoredPraticiesRepository(createDefaultStore("matriz-hub:praticies")),
    DEFAULT_PRACTICE_APPS,
  )
}

export function PraticiesAppStore({ apps }: { readonly apps: readonly PracticeAppVM[] }) {
  const [workspace, setWorkspace] = useState<PracticeWorkspaceVM>(() => toPracticeWorkspaceVM(createDefaultPraticiesState()))
  const [draft, setDraft] = useState<PracticeWorkspaceVM["layout"]>(workspace.layout)
  const [selectedId, setSelectedId] = useState(apps[0]?.id ?? "")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [persistence, setPersistence] = useState<"demo" | "database" | "browser">("browser")

  useEffect(() => {
    void fetch("/api/v1/capabilities/praticies", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("capability API unavailable")
      return await response.json() as CapabilityPracticiesResponseDTO
    }).then((payload) => {
      setWorkspace(toPracticeWorkspaceVM(payload.workspace)); setDraft(payload.workspace.layout); setPersistence(payload.persistence)
    }).catch(() => {
      const current = service().getState(); setWorkspace(toPracticeWorkspaceVM(current)); setDraft(current.layout); setPersistence("browser")
    })
  }, [])

  async function mutate(action: "install" | "uninstall" | "open" | "layout", practicyKey?: string, layout?: PracticeWorkspaceVM["layout"]) {
    try {
      const response = await fetch("/api/v1/capabilities/praticies", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, practicyKey, layout }) })
      if (!response.ok) throw new Error("capability API unavailable")
      const payload = await response.json() as CapabilityPracticiesResponseDTO
      setWorkspace(toPracticeWorkspaceVM(payload.workspace)); setDraft(payload.workspace.layout); setPersistence(payload.persistence)
      return payload.workspace
    } catch {
      const local = action === "install" ? service().install(practicyKey ?? "") : action === "uninstall" ? service().uninstall(practicyKey ?? "") : action === "open" ? service().recordOpen(practicyKey ?? "") : service().saveLayout(layout ?? [])
      setWorkspace(toPracticeWorkspaceVM(local)); setDraft(local.layout); setPersistence("browser"); return local
    }
  }

  const byId = useMemo(() => new Map(apps.map((app) => [app.id, app])), [apps])
  const selected = byId.get(selectedId) ?? apps[0]
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR")
    return apps.filter((app) => {
      const matchesKind = filter === "all" || app.kind === filter
      const searchable = `${app.name} ${app.summary} ${app.tags.join(" ")}`.toLocaleLowerCase("pt-BR")
      return matchesKind && (!term || searchable.includes(term))
    })
  }, [apps, filter, query])
  const recentApps = workspace.recent.map((entry) => byId.get(entry.appId)).filter(Boolean) as PracticeAppVM[]

  function select(appId: string) {
    setSelectedId(appId)
    void mutate("open", appId)
  }

  function install(appId: string) {
    void mutate("install", appId)
    select(appId)
  }

  function uninstall(appId: string) {
    void mutate("uninstall", appId)
  }

  function move(appId: string, delta: -1 | 1) {
    const index = draft.findIndex((item) => item.appId === appId)
    const target = draft[index + delta]
    if (target) setDraft(reorderLayout(draft, appId, target.appId))
  }

  function toggleSize(appId: string) {
    setDraft((current) => current.map((item) => item.appId === appId
      ? { ...item, size: item.size === "wide" ? "compact" : "wide" }
      : item))
  }

  function saveDesign() {
    void mutate("layout", undefined, draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/praticies" className={styles.brand}><span>M</span><strong>Praticies / Apps</strong></Link>
        <div className={styles.topStats}>
          <span><strong>{apps.length}</strong> no catálogo</span>
          <span><strong>{workspace.installedIds.length}</strong> instalados</span>
          <span><strong>{workspace.recent.length}</strong> recentes · {persistence === "database" ? "sincronizado" : persistence === "demo" ? "demo" : "navegador"}</span>
        </div>
        <Link href="/praticies" className={styles.backLink}>Abrir bancada ↗</Link>
      </header>

      <div className={styles.body}>
        <section className={styles.market}>
          <div className={styles.intro}>
            <div><p>UTILITY MARKET / LOCAL-FIRST</p><h1>Monte sua caixa<br />de ferramentas.</h1></div>
            <label className={styles.search}><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar apps, tags e ações" /></label>
          </div>

          <section className={styles.recents} aria-labelledby="recent-title">
            <div className={styles.sectionLabel}><span id="recent-title">RECENTES</span><small>últimos acessos</small></div>
            <div className={styles.recentRail}>
              {recentApps.length ? recentApps.map((app) => (
                <button key={app.id} type="button" onClick={() => select(app.id)}>
                  <i data-accent={app.accent}><PracticeIcon iconKey={app.iconKey} /></i><span><strong>{app.shortName}</strong><small>{app.kindLabel}</small></span>
                </button>
              )) : <p>Seus acessos aparecem aqui. Explore um app para começar.</p>}
            </div>
          </section>

          <section className={styles.catalog} aria-labelledby="catalog-title">
            <div className={styles.catalogHead}>
              <div className={styles.sectionLabel}><span id="catalog-title">TODOS OS APPS</span><small>{filtered.length} resultados</small></div>
              <div className={styles.filters} aria-label="Filtrar por tipo">
                {(["all", "automation", "snippet", "shortcut", "gadget"] as const).map((kind) => (
                  <button key={kind} type="button" aria-pressed={filter === kind} onClick={() => setFilter(kind)}>{kind === "all" ? "Todos" : kind}</button>
                ))}
              </div>
            </div>
            <div className={styles.appGrid}>
              {filtered.map((app) => {
                const installed = workspace.installedIds.includes(app.id)
                return (
                  <article key={app.id} className={styles.appCard} data-selected={selected?.id === app.id}>
                    <button className={styles.cardMain} type="button" onClick={() => select(app.id)}>
                      <span className={styles.appGlyph} data-accent={app.accent}><PracticeIcon iconKey={app.iconKey} /></span>
                      <span className={styles.cardCopy}><small>{app.kindLabel}</small><strong>{app.name}</strong><span>{app.summary}</span></span>
                    </button>
                    <button className={styles.installMini} type="button" disabled={app.availability === "preview"} onClick={() => installed ? uninstall(app.id) : install(app.id)}>
                      {app.availability === "preview" ? "Preview" : installed ? "Remover" : "Instalar"}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        </section>

        <aside className={styles.inspector}>
          {selected ? <>
            <div className={styles.detailHero} data-accent={selected.accent}>
              <span><PracticeIcon iconKey={selected.iconKey} /></span><small>{selected.availabilityLabel}</small>
            </div>
            <div className={styles.detailCopy}>
              <p>{selected.kindLabel} / {selected.tags.join(" · ")}</p>
              <h2>{selected.name}</h2>
              <span>{selected.description}</span>
              <ul>{selected.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            </div>
            <div className={styles.detailActions}>
              {workspace.installedIds.includes(selected.id) ? <>
                <Link href={selected.href} onClick={() => select(selected.id)}>Abrir app ↗</Link>
                <button type="button" onClick={() => uninstall(selected.id)}>Desinstalar</button>
              </> : <button className={styles.primaryAction} type="button" disabled={selected.availability === "preview"} onClick={() => install(selected.id)}>{selected.availability === "preview" ? "Entrar na lista de espera" : "Instalar no workspace"}</button>}
            </div>
          </> : null}

          <section className={styles.studio}>
            <div className={styles.studioHead}><div><p>DESIGN STUDIO</p><h3>Seu launcher</h3></div><button type="button" onClick={() => setDraft(workspace.layout)}>Desfazer</button></div>
            <p className={styles.studioHint}>Arraste para ordenar. Use os controles para toque ou teclado.</p>
            <div className={styles.dropZone}>
              {draft.map((item, index) => {
                const app = byId.get(item.appId)
                if (!app) return null
                return (
                  <article key={item.appId} draggable onDragStart={() => setDraggedId(item.appId)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) setDraft(reorderLayout(draft, draggedId, item.appId)); setDraggedId(null) }} data-size={item.size}>
                    <span><PracticeIcon iconKey={app.iconKey} /></span><strong>{app.shortName}</strong>
                    <div><button type="button" aria-label={`Mover ${app.name} para cima`} disabled={index === 0} onClick={() => move(app.id, -1)}>↑</button><button type="button" aria-label={`Mover ${app.name} para baixo`} disabled={index === draft.length - 1} onClick={() => move(app.id, 1)}>↓</button><button type="button" onClick={() => toggleSize(app.id)}>{item.size === "wide" ? "½" : "↔"}</button></div>
                  </article>
                )
              })}
              {!draft.length ? <p>Instale um app para começar seu layout.</p> : null}
            </div>
            <button className={styles.saveButton} type="button" onClick={saveDesign} disabled={!draft.length}>{saved ? "Design salvo ✓" : "Salvar design"}</button>
          </section>
        </aside>
      </div>
    </main>
  )
}
