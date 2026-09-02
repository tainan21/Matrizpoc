import type { DesktopGateway } from "../application/desktop-gateway"
import type { ActivityEnvelope, CommerceSnapshot, DesktopSettings, RuntimeInstance } from "../domain/types"

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
  theme: "matriz",
  closeToTray: true,
  soundsEnabled: true,
  volume: 0.45,
  startWithWindows: false,
  terminalDockOpen: false,
  terminalDockHeight: 280,
})

function unavailable(): never {
  throw new Error("O shell nativo do Matriz Control não está disponível.")
}

function demoCommerce(activeId?: string, installed = false): CommerceSnapshot {
  const definitions = [
    ["matriz.analytics", "Matriz Analytics", "Dashboards e análise operacional do ecossistema.", "Analytics", "willdash", 220],
    ["matriz.agent-pack", "AI Agent Pack", "Capacidades assistivas para workflows controlados.", "Agents", "matriz-workbench", 200],
    ["matriz.components", "Matriz Components", "Catálogo visual, tokens e playground do MatrizLib.", "Components", "matrizlib", 0],
    ["matriz.admin-tools", "Admin Tools", "Ferramentas operacionais para Matriz Admin.", "Developer Tools", "matriz-admin", 250],
  ] as const
  const active = definitions.find(([id]) => id === activeId)
  const price = active?.[5] ?? 0
  return {
    wallet: { balance: 1_250 - price, currency: "M", transactions: [
      ...(active ? [{ id: "demo-acquire", occurredAt: now, amount: -price, kind: "acquisition", title: active[1], packageId: active[0] }] : []),
      { id: "demo-grant", occurredAt: now - 86_400_000, amount: 1_250, kind: "grant", title: "Créditos iniciais" },
    ] },
    packages: definitions.map(([id, name, description, category, appId, packagePrice]) => ({ id, name, description, developer: "Matriz Team", version: "1.0.0", category, appId, price: packagePrice, permissions: ["runtime:observe"], compatibility: "Matriz Control 0.1+ · Windows 10/11", owned: id === activeId, installed: id === activeId && installed })),
  }
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
  gitSnapshot: async () => ({ revision: "demo", branch: "main", ahead: 0, behind: 0, changes: [], recent: [], branches: [], reflog: [] }),
  gitDiff: async () => unavailable(),
  gitStage: async () => unavailable(),
  gitUnstage: async () => unavailable(),
  gitCommit: async () => unavailable(),
  gitRemote: async () => unavailable(),
  systemPulse: async () => ({ cpuUsage: 0, cpuModel: "Browser preview", usedMemoryBytes: 0, totalMemoryBytes: 0, availableMemoryBytes: 0, uptimeSeconds: 0, windowsVersion: "Unavailable", temperatureCelsius: null, processCount: 0 }),
  getAwakeState: async () => false,
  setAwake: async () => unavailable(),
  scanNodeModules: async () => ({ scanId: "preview", candidates: [], potentialBytes: 0 }),
  deleteNodeModules: async () => unavailable(),
  readResumeSession: async () => ({ workspacePath: "", lastUsedAt: {} }),
  recordSessionContext: async () => ({ workspacePath: "", lastUsedAt: {} }),
  readSettings: async () => DEFAULT_SETTINGS,
  writeSettings: async () => unavailable(),
  checkUpdate: async () => ({ state: "unavailable", currentVersion: "1.1.0", reason: "Atualizações disponíveis somente no aplicativo instalado" }),
  downloadUpdate: async () => unavailable(),
  installUpdate: async () => unavailable(),
  hide: async () => unavailable(),
  quit: async () => unavailable(),
  terminalReadiness: async () => ({
    ready: false,
    conptyAvailable: false,
    sessionCount: 0,
    sessionLimit: 6,
    reason: "Terminal nativo disponível somente no Matriz Control instalado",
  }),
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
  listEnvironments: async () => [
    { fileName: ".env.local", size: 312, modifiedAt: now - 60_000 },
    { fileName: ".env.example", size: 148, modifiedAt: now - 86_400_000 },
  ],
  readEnvironment: async (appId, fileName) => ({ appId, fileName, revision: "demo-env", missingRequired: ["EMAIL_FROM"], variables: [
    { key: "NODE_ENV", value: "development", sensitive: false, source: fileName },
    { key: "PORT", value: "3002", sensitive: false, source: fileName },
    { key: "DATABASE_URL", sensitive: true, source: fileName },
    { key: "JWT_SECRET", sensitive: true, source: fileName },
    { key: "NEXT_PUBLIC_API_URL", value: "http://localhost:3000/api", sensitive: false, source: fileName },
  ] }),
  revealEnvironmentValue: async () => "••••••••",
  saveEnvironment: async (request) => ({ ...request, missingRequired: [], variables: request.variables.map((item) => ({ ...item, sensitive: /SECRET|TOKEN|PASSWORD|DATABASE_URL/.test(item.key), source: request.fileName })) }),
  compareEnvironments: async (appId, sourceFile, targetFile) => ({ appId, sourceFile, targetFile, targetRevision: "demo-target", entries: [
    { key: "DATABASE_URL", sensitive: true, status: "different" },
    { key: "PORT", sensitive: false, status: "equal", sourceValue: "3002", targetValue: "3002" },
    { key: "EMAIL_FROM", sensitive: false, status: "missingSource", targetValue: "ops@matriz.local" },
  ] }),
  promoteEnvironment: async (request) => ({ appId: request.appId, fileName: request.targetFile, revision: "demo-promoted", missingRequired: [], variables: [] }),
  findEnvironmentReferences: async (appId, key) => ({ appId, key, scannedFiles: 42, truncated: false, matches: [
    { relativePath: "src/config/database.ts", line: 12, excerpt: "const database = env.DATABASE_URL" },
    { relativePath: "src/bootstrap/index.ts", line: 8, excerpt: "requireEnv(\"DATABASE_URL\")" },
  ] }),
  listDirectory: async (appId, relativePath) => ({ appId, relativePath, entries: relativePath ? [
    { name: "dashboard.tsx", relativePath: `${relativePath}/dashboard.tsx`, isDirectory: false, size: 12400, modifiedAt: now - 60_000, extension: "tsx" },
    { name: "preview.png", relativePath: `${relativePath}/preview.png`, isDirectory: false, size: 245000, modifiedAt: now - 120_000, extension: "png" },
  ] : [
    { name: "src", relativePath: "src", isDirectory: true, size: 0, modifiedAt: now - 60_000 },
    { name: "public", relativePath: "public", isDirectory: true, size: 0, modifiedAt: now - 90_000 },
    { name: "package.json", relativePath: "package.json", isDirectory: false, size: 1240, modifiedAt: now - 120_000, extension: "json" },
  ] }),
  previewFile: async (appId, relativePath) => ({ appId, relativePath, name: relativePath.split("/").pop() ?? relativePath, size: 12400, content: { kind: "text", value: "export function Dashboard() {\n  return <main>Matriz Admin</main>\n}\n" } }),
  openResource: async () => unavailable(),
  revealResource: async () => unavailable(),
  openResourceInEditor: async () => unavailable(),
  renameResource: async () => unavailable(),
  duplicateResource: async () => unavailable(),
  recycleResource: async () => unavailable(),
  commerceSnapshot: async () => demoCommerce(),
  acquirePackage: async (packageId) => demoCommerce(packageId),
  installPackage: async (packageId) => demoCommerce(packageId, true),
  uninstallPackage: async (packageId) => demoCommerce(packageId, false),
  repairPackage: async (packageId) => demoCommerce(packageId, true),
  activatePackage: async (packageId) => {
    const item = demoCommerce(packageId, true).packages.find(({ id }) => id === packageId)
    if (!item) throw new Error("Package is not in the trusted Matriz catalog")
    if (item.appId === "matriz-desktop") throw new Error("Built-in utility unavailable in browser preview")
    return { kind: "runtime", packageId, appId: item.appId, operationId: `app.${item.appId}.web`, routePath: "/" }
  },
  recoverRuntime: async (appId) => ({ appId, status: "ready", sessionId: `demo-${appId}` }),
  runbookCatalog: async () => [
    { id: "validate-environment", label: "Validar ambiente", description: "ENV e Doctor em uma passagem.", steps: ["environment.validate", "doctor.run"] },
    { id: "recover-open", label: "Recuperar e abrir", description: "Recupera o runtime e abre sua rota principal.", steps: ["runtime.recover", "runtime.open"] },
    { id: "apply-visualize", label: "Validar e visualizar", description: "Valida o ambiente salvo, recupera e oferece Preview.", steps: ["environment.validate", "runtime.recover", "preview.offer"] },
  ],
  runRunbook: async (runbookId, appId) => ({ runbookId, appId, status: "completed", steps: [], target: { appId, routePath: "/" } }),
}
