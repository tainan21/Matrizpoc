import { contextBridge, ipcRenderer } from "electron"
import type { BrowserEvent, DesktopBridge, DesktopCommand } from "../src/application/desktop-bridge"

const bridge: DesktopBridge = {
  invoke: (command: DesktopCommand) => ipcRenderer.invoke("matriz:browser:invoke", command),
  subscribe: (listener: (event: BrowserEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: BrowserEvent) => listener(value)
    ipcRenderer.on("matriz:browser:event", handler)
    return () => ipcRenderer.removeListener("matriz:browser:event", handler)
  },
  reportViewport: (bounds) => ipcRenderer.send("matriz:browser:viewport", bounds),
}

contextBridge.exposeInMainWorld("matrizDesktop", Object.freeze(bridge))
