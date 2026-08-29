"use client"

import type { InstallableAppViewModel } from "./installable-apps-presenter"
import type { ExtensionNavigationGroup } from "../../modules/extensions/public"
import styles from "./app-host.module.css"

interface SmartAppRailProps {
  readonly apps: readonly InstallableAppViewModel[]
  readonly activeAppId: string | null
  readonly onActivate: (appId: string | null) => void
  readonly onOpenPath?: (appId: string, path: string) => void
  readonly navigation?: readonly ExtensionNavigationGroup[]
}

export function SmartAppRail({ apps, activeAppId, onActivate, onOpenPath, navigation = [] }: SmartAppRailProps) {
  const installedApps = apps.filter((app) => app.installed)
  if (installedApps.length === 0) return null

  return <nav className={styles.rail} aria-label="Alternar apps">
    <button className={styles.railItem} data-active={activeAppId === null || undefined} type="button" aria-label="Control" aria-pressed={activeAppId === null} onClick={() => onActivate(null)}>
      <span className={styles.glyph} aria-hidden="true">M</span>
      <span className={styles.railCopy}><strong>Control</strong><small>{activeAppId === null ? "ATIVO" : "LOCAL"}</small></span>
    </button>
    {installedApps.map((app) => <div key={app.appId} className={styles.railGroup}><button className={styles.railItem} data-active={app.appId === activeAppId || undefined} type="button" aria-label={app.name} aria-pressed={app.appId === activeAppId} onClick={() => onActivate(app.appId)}>
      <span className={styles.glyph} aria-hidden="true">{app.glyph}</span>
      <span className={styles.railCopy}><strong>{app.name}</strong><small>{app.appId === activeAppId ? "ATIVO" : "PRONTO"}</small></span>
    </button>{navigation.filter((group) => group.appId === app.appId).map((group) => <div className={styles.extensionNav} aria-label={group.label} key={group.id}><strong>{group.label}</strong>{group.items.map((item) => <button key={item.id} type="button" onClick={() => onOpenPath?.(group.appId, item.path)}>{item.label}</button>)}</div>)}</div>)}
  </nav>
}
