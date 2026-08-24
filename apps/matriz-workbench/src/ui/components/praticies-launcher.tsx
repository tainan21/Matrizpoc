"use client"

import { useEffect, useMemo, useState } from "react"
import { DEFAULT_PRACTICE_APPS, PraticiesService, createDefaultPraticiesState, createStoredPraticiesRepository, type PracticeIconKey } from "@matriz/flows-praticies"
import type { CapabilityPracticiesResponseDTO } from "@matriz/integration-api-contracts"
import { monorepoConfig } from "@matriz/platform-config"
import { createDefaultStore } from "@matriz/platform-storage"
import { toWorkbenchPraticiesWorkspaceVM, type WorkbenchPracticeVM, type WorkbenchPraticiesWorkspaceVM } from "../presenters/praticies-presenter"
import styles from "./praticies-launcher.module.css"

const HUB_BASE_URL = monorepoConfig.baseUrls["matriz-hub"]
const PRACTICIES_API_URL = `${HUB_BASE_URL}/api/v1/capabilities/praticies`

function service() {
  return new PraticiesService(createStoredPraticiesRepository(createDefaultStore("matriz-workbench:praticies")), DEFAULT_PRACTICE_APPS)
}

const icons: Record<PracticeIconKey, string> = { folders: "▦", checklist: "✓", compass: "⌖", note: "≡", spark: "✦", timer: "◷" }

export function PraticiesLauncher({ apps }: { readonly apps: readonly WorkbenchPracticeVM[] }) {
  const [workspace, setWorkspace] = useState<WorkbenchPraticiesWorkspaceVM>(() => toWorkbenchPraticiesWorkspaceVM(createDefaultPraticiesState()))
  const [selectedId, setSelectedId] = useState(apps[0]?.id ?? "")
  const [scope, setScope] = useState<"installed" | "all">("installed")
  useEffect(() => {
    void fetch(PRACTICIES_API_URL, { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<CapabilityPracticiesResponseDTO> : Promise.reject())
      .then((payload) => setWorkspace(toWorkbenchPraticiesWorkspaceVM(payload.workspace)))
      .catch(() => setWorkspace(toWorkbenchPraticiesWorkspaceVM(service().getState())))
  }, [])
  const byId = useMemo(() => new Map(apps.map((app) => [app.id, app])), [apps])
  const selected = byId.get(selectedId) ?? apps[0]
  const visible = scope === "all" ? apps : apps.filter((app) => workspace.installedIds.includes(app.id))
  const recents = workspace.recent.map((entry) => byId.get(entry.appId)).filter(Boolean) as WorkbenchPracticeVM[]

  async function mutate(action: "install" | "uninstall" | "open", appId: string) {
    try {
      const response = await fetch(PRACTICIES_API_URL, { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, practicyKey: appId }) })
      if (!response.ok) throw new Error("Hub unavailable")
      const payload = await response.json() as CapabilityPracticiesResponseDTO
      setWorkspace(toWorkbenchPraticiesWorkspaceVM(payload.workspace))
    } catch {
      const next = action === "install" ? service().install(appId) : action === "uninstall" ? service().uninstall(appId) : service().recordOpen(appId)
      setWorkspace(toWorkbenchPraticiesWorkspaceVM(next))
    }
  }
  function inspect(appId: string) { setSelectedId(appId); void mutate("open", appId) }
  function toggleInstall(appId: string) {
    const installed = workspace.installedIds.includes(appId)
    void mutate(installed ? "uninstall" : "install", appId)
    setSelectedId(appId)
  }

  return (
    <main className={styles.page}>
      <header className="page-header">
        <div><p className="eyebrow">Praticies</p><h1>Apps locais</h1><p>Instale pequenas ferramentas e mantenha as mais úteis a um clique.</p></div>
        <a className={styles.marketLink} href={`${HUB_BASE_URL}/praticies/apps`}>Abrir loja completa ↗</a>
      </header>
      <section className={styles.metrics}>
        <div><strong>{workspace.installedIds.length}</strong><span>instalados</span></div><div><strong>{workspace.recent.length}</strong><span>recentes</span></div><div><strong>{apps.filter((app) => app.availability === "preview").length}</strong><span>em preview</span></div>
      </section>
      <section className={styles.recentSection} aria-labelledby="wb-recent-title">
        <div className={styles.sectionHead}><div><p className="eyebrow">Continuidade</p><h2 id="wb-recent-title">Recentes</h2></div><span>por acesso local</span></div>
        <div className={styles.recents}>{recents.length ? recents.map((app) => <button key={app.id} type="button" onClick={() => inspect(app.id)}><i>{icons[app.iconKey]}</i><span><strong>{app.name}</strong><small>{app.kindLabel}</small></span></button>) : <p>Nenhum app acessado neste ambiente.</p>}</div>
      </section>
      <div className={styles.workspace}>
        <section className={styles.library}>
          <div className={styles.sectionHead}><div><p className="eyebrow">Launcher</p><h2>{scope === "installed" ? "Seus apps" : "Catálogo"}</h2></div><div className={styles.tabs}><button type="button" aria-pressed={scope === "installed"} onClick={() => setScope("installed")}>Instalados</button><button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>Todos</button></div></div>
          <div className={styles.list}>
            {visible.map((app) => <article key={app.id} data-active={app.id === selected?.id}><button className={styles.inspect} type="button" onClick={() => inspect(app.id)}><i>{icons[app.iconKey]}</i><span><small>{app.kindLabel}</small><strong>{app.name}</strong><em>{app.summary}</em></span></button><button className={styles.install} type="button" disabled={app.availability === "preview"} onClick={() => toggleInstall(app.id)}>{app.availability === "preview" ? "Preview" : workspace.installedIds.includes(app.id) ? "Remover" : "Instalar"}</button></article>)}
            {!visible.length ? <p className={styles.empty}>Nenhum app instalado. Abra “Todos” para montar seu launcher.</p> : null}
          </div>
        </section>
        <aside className={styles.detail}>{selected ? <><div className={styles.detailMark}>{icons[selected.iconKey]}</div><p className="eyebrow">{selected.kindLabel} · {selected.availability === "ready" ? "disponível" : "preview"}</p><h2>{selected.name}</h2><p>{selected.description}</p><ul>{selected.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><div className={styles.detailActions}>{workspace.installedIds.includes(selected.id) ? <a href={selected.href} onClick={() => inspect(selected.id)}>Abrir utilitário ↗</a> : <button type="button" disabled={selected.availability === "preview"} onClick={() => toggleInstall(selected.id)}>Instalar</button>}</div></> : null}</aside>
      </div>
    </main>
  )
}
