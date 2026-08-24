import type { DesktopAppId, RuntimeInstance, RuntimeTarget } from "../domain/types"

export interface ActionContext {
  readonly runtime: RuntimeInstance
  readonly activeRoute: string
  readonly terminalSessionId?: string
  readonly previewOpen: boolean
}

export type RuntimeActionId =
  | "runtime.start" | "runtime.open" | "runtime.preview" | "runtime.route"
  | "runtime.copy-url" | "runtime.restart" | "runtime.stop" | "runtime.terminal"
  | "runtime.clear-terminal"

export interface ContextualAction {
  readonly id: RuntimeActionId
  readonly label: string
  readonly group: "navigation" | "runtime" | "terminal"
  readonly risk: "safe" | "destructive"
}

export interface ActionServices {
  start(appId: DesktopAppId): void | Promise<void>
  open(target: RuntimeTarget): void | Promise<void>
  preview(target: RuntimeTarget): void | Promise<void>
  chooseRoute(appId: DesktopAppId): void | Promise<void>
  copyUrl(target: RuntimeTarget): void | Promise<void>
  restart(appId: DesktopAppId): void | Promise<void>
  stop(appId: DesktopAppId): void | Promise<void>
  focusTerminal(sessionId?: string): void | Promise<void>
  clearTerminal(sessionId: string): void | Promise<void>
}

const descriptors: Readonly<Record<RuntimeActionId, ContextualAction>> = Object.freeze({
  "runtime.start": { id: "runtime.start", label: "Iniciar", group: "runtime", risk: "safe" },
  "runtime.open": { id: "runtime.open", label: "Abrir", group: "navigation", risk: "safe" },
  "runtime.preview": { id: "runtime.preview", label: "Preview", group: "navigation", risk: "safe" },
  "runtime.route": { id: "runtime.route", label: "Abrir rota…", group: "navigation", risk: "safe" },
  "runtime.copy-url": { id: "runtime.copy-url", label: "Copiar URL", group: "navigation", risk: "safe" },
  "runtime.restart": { id: "runtime.restart", label: "Reiniciar", group: "runtime", risk: "safe" },
  "runtime.stop": { id: "runtime.stop", label: "Parar", group: "runtime", risk: "destructive" },
  "runtime.terminal": { id: "runtime.terminal", label: "Terminal", group: "terminal", risk: "safe" },
  "runtime.clear-terminal": { id: "runtime.clear-terminal", label: "Limpar terminal", group: "terminal", risk: "destructive" },
})

export function getRuntimeActions(context: ActionContext): readonly ContextualAction[] {
  const { runtime } = context
  if (runtime.status === "stopped") return [descriptors["runtime.start"], descriptors["runtime.terminal"]]
  const result: ContextualAction[] = [descriptors["runtime.open"], descriptors["runtime.preview"],
    descriptors["runtime.route"], descriptors["runtime.copy-url"]]
  if (runtime.ownership === "managed") result.push(descriptors["runtime.restart"], descriptors["runtime.stop"])
  result.push(descriptors["runtime.terminal"])
  if (runtime.sessionId) result.push(descriptors["runtime.clear-terminal"])
  return result
}

export async function executeRuntimeAction(
  id: RuntimeActionId, context: ActionContext, services: ActionServices,
): Promise<void> {
  if (!getRuntimeActions(context).some((action) => action.id === id)) {
    throw new Error(`Ação indisponível para ${context.runtime.label}`)
  }
  const target = { appId: context.runtime.id, routePath: context.activeRoute }
  switch (id) {
    case "runtime.start": await services.start(context.runtime.id); break
    case "runtime.open": await services.open(target); break
    case "runtime.preview": await services.preview(target); break
    case "runtime.route": await services.chooseRoute(context.runtime.id); break
    case "runtime.copy-url": await services.copyUrl(target); break
    case "runtime.restart": await services.restart(context.runtime.id); break
    case "runtime.stop": await services.stop(context.runtime.id); break
    case "runtime.terminal": await services.focusTerminal(context.runtime.sessionId); break
    case "runtime.clear-terminal": await services.clearTerminal(context.runtime.sessionId!); break
  }
}
