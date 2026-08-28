import { contextBridge, ipcRenderer } from "electron"

const invoke = <T,>(channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args) as Promise<T>
contextBridge.exposeInMainWorld("matrizUninstall", {
  shell: "electron",
  listInstalled: () => invoke("matriz:list-installed"),
  install: (productId: string) => invoke("matriz:install", productId),
  update: (productId: string) => invoke("matriz:update", productId),
  reinstall: (productId: string, installationId: string) => invoke("matriz:reinstall", productId, installationId),
  uninstall: (installationId: string) => invoke("matriz:uninstall", installationId),
  cleanupPreview: (productId: string) => invoke("matriz:cleanup-preview", productId),
  cleanup: (productId: string, candidateIds: readonly string[]) => invoke("matriz:cleanup", productId, candidateIds),
  selfUninstall: () => invoke("matriz:self-uninstall"),
})
