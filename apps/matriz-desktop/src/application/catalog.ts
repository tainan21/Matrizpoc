import type { DesktopAppId, GateId, ManagedOperationId, QuickTargetId } from "../domain/types"

export interface DesktopAppDefinition {
  readonly id: DesktopAppId
  readonly label: string
  readonly packageName: string
  readonly port: number
}

export const MATRIZ_DESKTOP_APPS: readonly DesktopAppDefinition[] = Object.freeze([
  { id: "matriz-hub", label: "Hub", packageName: "@matriz/app-matriz-hub", port: 3000 },
  { id: "spot", label: "Spot", packageName: "@matriz/app-spot", port: 3001 },
  { id: "matriz-admin", label: "Matriz Admin", packageName: "@matriz/app-matriz-admin", port: 3002 },
  { id: "contracts", label: "Contracts", packageName: "@matriz/app-contracts", port: 3003 },
  { id: "willdash", label: "Willdash", packageName: "@matriz/app-willdash", port: 3004 },
  {
    id: "matriz-workbench",
    label: "Workbench",
    packageName: "@matriz/app-matriz-workbench",
    port: 3005,
  },
  { id: "sites", label: "Sites", packageName: "@matriz/app-sites", port: 3006 },
  { id: "matrizlib", label: "MatrizLib", packageName: "@matriz/app-matrizlib", port: 3007 },
  { id: "seumei", label: "Seumei", packageName: "@matriz/app-seumei", port: 3008 },
  { id: "health", label: "Health", packageName: "@matriz/app-health", port: 3010 },
  { id: "matriz-ops", label: "Matriz Ops", packageName: "@matriz/app-matriz-ops", port: 3011 },
  { id: "matriz-pay", label: "Matriz Pay", packageName: "@matriz/app-matriz-pay", port: 3012 },
  { id: "matriz-client-admin", label: "Client Admin", packageName: "@matriz/app-client-admin", port: 3013 },
])

export const GATES: readonly { readonly id: GateId; readonly label: string }[] = Object.freeze([
  { id: "typecheck", label: "Types" },
  { id: "lint", label: "Lint" },
  { id: "test:smoke", label: "Smoke" },
  { id: "prisma:validate", label: "Prisma" },
])

export const QUICK_TARGETS: readonly { readonly id: QuickTargetId; readonly label: string }[] =
  Object.freeze([
    { id: "workspace", label: "Files" },
    { id: "terminal", label: "Terminal" },
    { id: "hub", label: "Hub" },
    { id: "matrizlib", label: "MatrizLib" },
    { id: "workbench", label: "Workbench" },
  ])

export const MANAGED_OPERATIONS: readonly {
  readonly id: ManagedOperationId
  readonly label: string
}[] = Object.freeze([
  ...MATRIZ_DESKTOP_APPS.map((app) => ({
    id: `app.${app.id}.web` as const,
    label: `${app.label} / Web`,
  })),
  { id: "app.matriz-admin.native.build", label: "Matriz Admin / Gerar" },
  { id: "app.matriz-admin.native.install", label: "Matriz Admin / Instalar" },
  { id: "app.matriz-admin.native.start", label: "Matriz Admin / Nativo" },
  ...GATES.map((gate) => ({ id: `gate.${gate.id}` as const, label: gate.label })),
])
