"use client"

import type { InstallableAppViewModel } from "./installable-apps-presenter"
import styles from "./app-host.module.css"

interface SmartAppRailProps {
  readonly apps: readonly InstallableAppViewModel[]
  readonly activeAppId: string | null
  readonly onActivate: (appId: string | null) => void
}

export function SmartAppRail({ apps, activeAppId, onActivate }: SmartAppRailProps) {
  const installedApps = apps.filter((app) => app.installed)
  if (installedApps.length === 0) return null

  return <nav className={styles.rail} aria-label="Alternar apps">
    <button className={styles.railItem} data-active={activeAppId === null || undefined} type="button" aria-label="Control" aria-pressed={activeAppId === null} onClick={() => onActivate(null)}>
      <span className={styles.glyph} aria-hidden="true">M</span>
      <span className={styles.railCopy}><strong>Control</strong><small>{activeAppId === null ? "ATIVO" : "LOCAL"}</small></span>
    </button>
    {installedApps.map((app) => <button className={styles.railItem} data-active={app.appId === activeAppId || undefined} type="button" aria-label={app.name} aria-pressed={app.appId === activeAppId} key={app.appId} onClick={() => onActivate(app.appId)}>
      <span className={styles.glyph} aria-hidden="true">{app.glyph}</span>
      <span className={styles.railCopy}><strong>{app.name}</strong><small>{app.appId === activeAppId ? "ATIVO" : "PRONTO"}</small></span>
    </button>)}
  </nav>
}
