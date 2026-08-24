import type { DesktopGateway } from "../application/desktop-gateway"
import type { ActivityEnvelope, DesktopSettings, RuntimeInstance } from "../domain/types"

const DEMO_RUNTIMES: readonly RuntimeInstance[] = [
  ["matriz-hub", "Matriz Hub", 3000], ["spot", "Spot", 3001],
  ["matriz-admin", "Matriz Admin", 3002], ["contracts", "Contracts", 3003],
  ["willdash", "Willdash", 3004], ["matriz-workbench", "Workbench", 3005],
  ["sites", "Sites", 3006], ["matrizlib", "MatrizLib", 3007], ["seumei", "Seumei", 3008],
].map<RuntimeInstance>(([id, label, port], index) => ({
  id: id as RuntimeInstance["id"], label: label as string, port: port as number,
  status: index < 7 ? "ready" : "stopped", ownership: index < 7 ? "managed" : "none",
  pid: index < 7 ? 4100 + index : undefined, sessionId: index < 7 ? `demo-${id}` : undefined,
  endpoint: `http://localhost:${port}/`, health: index < 7 ? "healthy" : "offline",
}))

const now = Date.now()
const DEMO_ACTIVITY: readonly ActivityEnvelope[] = [
  { id: "demo-1", sequence: 1, occurredAt: now - 240_000, kind: "runtime.started", severity: "success", title: "Matriz Admin iniciado", detail: "localhost:3002", appId: "matriz-admin" },
  { id: "demo-2", sequence: 2, occurredAt: now - 170_000, kind: "terminal.command.completed", severity: "success", title: "Build finalizado", detail: "7 arquivos atualizados", appId: "matriz-admin" },
  { id: "demo-3", sequence: 3, occurredAt: now - 110_000, kind: "runtime.route.ready", severity: "info", title: "Rota pronta", detail: "/establishments", appId: "matriz-admin" },
  { id: "demo-4", sequence: 4, occurredAt: now - 50_000, kind: "quality.warning", severity: "warning", title: "3 warnings", detail: "MatrizLib", appId: "matrizlib" },
  { id: "demo-5", sequence: 5, occurredAt: now - 20_000, kind: "automation.completed", severity: "success", title: "Validação concluída", detail: "Doctor e typecheck" },
]

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
  runtimeSnapshot: async () => DEMO_RUNTIMES,
  openRuntimeTarget: async () => unavailable(),
  restartRuntime: async () => unavailable(),
  stopRuntime: async () => unavailable(),
  openPreview: async ({ appId, routePath }) => ({ appId, routePath, url: `http://localhost:${DEMO_RUNTIMES.find((item) => item.id === appId)?.port}${routePath}`, status: "ready" }),
  setPreviewBounds: async () => undefined,
  navigatePreview: async ({ appId, routePath }) => ({ appId, routePath, url: `http://localhost:${DEMO_RUNTIMES.find((item) => item.id === appId)?.port}${routePath}`, status: "ready" }),
  previewBack: async () => undefined,
  previewForward: async () => undefined,
  reloadPreview: async () => undefined,
  closePreview: async () => undefined,
  activityHistory: async () => DEMO_ACTIVITY,
  subscribeActivity: async () => undefined,
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
  createTerminal: async () => unavailable(),
  writeTerminal: async () => unavailable(),
  resizeTerminal: async () => unavailable(),
  interruptTerminal: async () => unavailable(),
  closeTerminal: async () => unavailable(),
  listTerminals: async () => [],
  subscribeTerminal: async () => undefined,
  startManagedOperation: async () => unavailable(),
  getNativeAppRuntime: async () => ({ appId: "matriz-admin", state: "not-built" }),
  installNativeApp: async () => unavailable(),
  startNativeApp: async () => unavailable(),
  stopNativeApp: async () => unavailable(),
}
