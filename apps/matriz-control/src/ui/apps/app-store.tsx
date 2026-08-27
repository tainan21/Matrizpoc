"use client"

import { useInstalledApps } from "./installed-apps-context"
import type { DesktopCommand, StoreAppSnapshot } from "../../domain/desktop-bridge"
import styles from "./app-store.module.css"

export function openInstalledApp(appId: string, activate: (appId: string) => void) {
  activate(appId)
}

export function presentNativeStoreAction(state: StoreAppSnapshot["state"]): "download" | "cancel-download" | "install" | "open" | null {
  if (state === "available" || state === "cancelled" || state === "failed") return "download"
  if (state === "downloading") return "cancel-download"
  if (state === "downloaded") return "install"
  if (state === "installed" || state === "update_available") return "open"
  return null
}

export function AppStore() {
  const { apps, activate, install, uninstall, storeAction } = useInstalledApps()

  return <main className={styles.store}>
    <header className={styles.header}>
      <div>
        <p>CATÁLOGO / LOCAL</p>
        <h1>Store</h1>
      </div>
      <span>APPS CONHECIDOS</span>
    </header>
    <p className={styles.intro}>Instale apenas utilitários aprovados para este computador. A instalação registra a disponibilidade no Control; ela não inicia nenhum processo.</p>
    <section className={styles.grid} aria-label="Aplicativos disponíveis">
      {apps.map((app) => <article className={styles.card} data-accent={app.accent} key={app.appId}>
        <div className={styles.cardTop}>
          <span className={styles.glyph} aria-hidden="true">{app.glyph}</span>
          <span className={app.installed ? styles.installed : styles.available}>{app.installed ? "INSTALADO" : "DISPONÍVEL"}</span>
        </div>
        <h2>{app.name}</h2>
        <p>{app.description}</p>
        <dl className={styles.details}>
          <div><dt>{app.kind === "activation" ? "Runtime" : "Pacote"}</dt><dd>{app.kind === "activation" ? app.baseUrl : app.nativeState?.toUpperCase()}</dd></div>
          <div><dt>Capacidades</dt><dd>{app.capabilities.length}</dd></div>
        </dl>
        {app.kind === "windows_installer" ? <p aria-live="polite">{app.statusMessage}{app.totalBytes ? ` ${app.bytesDownloaded}/${app.totalBytes} bytes.` : ""}</p> : null}
        <ul className={styles.capabilities}>{app.capabilities.map((capability) => <li key={capability.id}><strong>{capability.name}</strong><span>{capability.description}</span></li>)}</ul>
        <div className={styles.actions}>
          {app.kind === "activation" && app.installed ? <>
            <button className={styles.secondary} onClick={() => openInstalledApp(app.appId, activate)}>Abrir</button>
            <button className={styles.danger} onClick={() => uninstall(app.appId)}>Desinstalar</button>
          </> : app.kind === "activation" ? <button className={styles.primary} onClick={() => install(app.appId)}>Instalar</button> : <NativeStoreActions appId={app.appId as "matriz-workbench" | "seumei"} state={app.nativeState!} onAction={storeAction} />}
        </div>
      </article>)}
    </section>
  </main>
}

type StoreMutationType = Extract<DesktopCommand, { type: `store.app.${string}` }>["type"]

function NativeStoreActions({ appId, state, onAction }: { appId: "matriz-workbench" | "seumei"; state: StoreAppSnapshot["state"]; onAction: (type: StoreMutationType, appId: "matriz-workbench" | "seumei") => Promise<void> }) {
  const action = presentNativeStoreAction(state)
  if (state === "unavailable") return null
  if (state === "installed" || state === "update_available") return <>
    <button className={styles.secondary} onClick={() => void onAction("store.app.open", appId)}>Abrir</button>
    <button className={styles.secondary} onClick={() => void onAction("store.app.check-update", appId)}>Verificar atualização</button>
    <button className={styles.danger} onClick={() => void onAction("store.app.uninstall", appId)}>Desinstalar</button>
  </>
  if (!action) return null
  const label = action === "download" ? "Baixar" : action === "cancel-download" ? "Cancelar download" : "Instalar"
  return <button className={styles.primary} onClick={() => void onAction(`store.app.${action}`, appId)}>{label}</button>
}
