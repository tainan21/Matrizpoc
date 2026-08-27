export interface ManualUpdater {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(): void
}

export function configureManualUpdater(updater: ManualUpdater) {
  updater.autoDownload = false
  updater.autoInstallOnAppQuit = false
  return { check: () => updater.checkForUpdates(), download: () => updater.downloadUpdate(), install: () => updater.quitAndInstall() }
}
