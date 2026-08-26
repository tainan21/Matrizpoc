"use client"

import { useInstalledApps } from "./installed-apps-context"
import styles from "./app-store.module.css"

export function openInstalledApp(appId: string, activate: (appId: string) => void) {
  activate(appId)
}

export function AppStore() {
  const { apps, activate, install, uninstall } = useInstalledApps()

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
          <div><dt>Runtime</dt><dd>{app.baseUrl}</dd></div>
          <div><dt>Capacidades</dt><dd>{app.capabilities.length}</dd></div>
        </dl>
        <ul className={styles.capabilities}>{app.capabilities.map((capability) => <li key={capability.id}><strong>{capability.name}</strong><span>{capability.description}</span></li>)}</ul>
        <div className={styles.actions}>
          {app.installed ? <>
            <button className={styles.secondary} onClick={() => openInstalledApp(app.appId, activate)}>Abrir</button>
            <button className={styles.danger} onClick={() => uninstall(app.appId)}>Desinstalar</button>
          </> : <button className={styles.primary} onClick={() => install(app.appId)}>Instalar</button>}
        </div>
      </article>)}
    </section>
  </main>
}
