import type { DesktopGateway } from "../application/desktop-gateway"
import type { DesktopSettings } from "../domain/types"

const DEFAULT_SETTINGS: DesktopSettings = Object.freeze({
  closeToTray: true,
  soundsEnabled: true,
  volume: 0.45,
  startWithWindows: false,
})

function unavailable(): never {
  throw new Error("O shell nativo do Matriz Control não está disponível.")
}

export const unavailableGateway: DesktopGateway = {
  snapshot: async () => ({ snapshotId: "web-preview", ports: [] }),
  kill: async () => unavailable(),
  killMany: async () => unavailable(),
  startApp: async () => unavailable(),
  stopApp: async () => unavailable(),
  appStatuses: async () => [],
  runGate: async () => unavailable(),
  openTarget: async () => unavailable(),
  selectWorkspace: async () => unavailable(),
  doctor: async () => [],
  workspacePulse: async () => ({ branch: "preview", changedFiles: 0, clean: true }),
  readSettings: async () => DEFAULT_SETTINGS,
  writeSettings: async () => unavailable(),
  hide: async () => unavailable(),
  quit: async () => unavailable(),
}
