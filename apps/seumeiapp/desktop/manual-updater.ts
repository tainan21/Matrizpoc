export type AutoUpdaterAdapter = {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  checkForUpdates: () => Promise<unknown> | unknown
  downloadUpdate: () => Promise<unknown> | unknown
  quitAndInstall: () => void
}

export function createManualUpdater(adapter: AutoUpdaterAdapter) {
  adapter.autoDownload = false
  adapter.autoInstallOnAppQuit = false
  return {
    check: () => Promise.resolve(adapter.checkForUpdates()),
    download: () => Promise.resolve(adapter.downloadUpdate()),
    install: () => adapter.quitAndInstall(),
  }
}
