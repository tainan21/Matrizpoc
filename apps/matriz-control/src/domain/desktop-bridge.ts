import type { AgentPolicy, BrowserTab, Capsule } from "./browser"
import type { BrowserCommand } from "../application/browser-runtime"
import type { VaultStatus } from "../integration/browser/bitlocker-vault"
import type { WorkspaceFileSnapshot } from "../integration/browser/workspace-file-repository"
import type { WorkbenchRuntimeSnapshot } from "./workbench-runtime"
import type { ControlHostHealthSnapshot } from "../application/host-health-snapshot"

export type DesktopUpdateState = "unavailable" | "idle" | "checking" | "available" | "downloading" | "downloaded" | "current" | "error"
export type DesktopUpdateSnapshot = {
  state: DesktopUpdateState
  currentVersion: string
  availableVersion: string | null
  progress: number | null
  notes: string | null
  message: string
}

export type DesktopCommand = BrowserCommand
  | { type: "browser.status" }
  | { type: "tab.activate"; tabId: string }
  | { type: "tab.close"; tabId: string }
  | { type: "tab.navigate"; tabId: string; input: string }
  | { type: "tab.back" | "tab.forward" | "tab.reload"; tabId: string }
  | { type: "page.screenshot" | "page.pdf" | "page.reader"; tabId: string }
  | { type: "page.find"; tabId: string; text: string }
  | { type: "page.snapshot"; tabId: string }
  | { type: "page.click"; tabId: string; ref: string }
  | { type: "page.type"; tabId: string; ref: string; text: string }
  | { type: "page.download"; tabId: string; url: string }
  | { type: "project.list" }
  | { type: "library.search"; capsuleId: string; query: string }
  | { type: "file.read"; projectId: string; path: string; capsuleId?: string }
  | { type: "file.write"; projectId: string; path: string; content: string; expectedVersion: string; capsuleId?: string }
  | { type: "vault.status" | "vault.provision" | "vault.unlock" | "vault.lock" }
  | { type: "agent.policy"; capsuleId: string; policy: AgentPolicy }
  | { type: "agent.kill" }
  | { type: "health.host-snapshot" }
  | { type: "workbench.status" | "workbench.open" | "workbench.restart" }
  | { type: "update.status" | "update.check" | "update.download" | "update.install" }

export type DesktopResult = Capsule | Capsule[] | BrowserTab | BrowserTab[] | VaultStatus | WorkspaceFileSnapshot | WorkbenchRuntimeSnapshot | ControlHostHealthSnapshot | DesktopUpdateSnapshot | { available: true; version: string } | { id: string; name: string }[] | Array<{ kind: "bookmark" | "note"; title: string; url: string | null }> | { ok: true } | string | null

export type BrowserEvent =
  | { type: "tab.updated"; tab: BrowserTab }
  | { type: "tab.closed"; tabId: string }
  | { type: "download.updated"; id: string; filename: string; state: "progressing" | "completed" | "cancelled" | "failed" }
  | { type: "permission.requested"; capsuleId: string; origin: string; permission: string }
  | { type: "runtime.failed"; message: string }
  | { type: "workbench.updated"; snapshot: WorkbenchRuntimeSnapshot }
  | { type: "update.updated"; snapshot: DesktopUpdateSnapshot }

export interface DesktopBridge {
  invoke(command: DesktopCommand): Promise<DesktopResult>
  subscribe(listener: (event: BrowserEvent) => void): () => void
  reportViewport(bounds: { x: number; y: number; width: number; height: number; visible: boolean }): void
}

const noPayload = new Set(["browser.status", "capsule.list", "project.list", "vault.status", "vault.provision", "vault.unlock", "vault.lock", "agent.kill", "health.host-snapshot", "workbench.status", "workbench.open", "workbench.restart"])
const updaterCommands = new Set(["update.status", "update.check", "update.download", "update.install"])
const tabOnly = new Set(["tab.activate", "tab.close", "tab.back", "tab.forward", "tab.reload", "page.screenshot", "page.pdf", "page.reader", "page.snapshot"])

export function parseDesktopCommand(value: unknown): DesktopCommand {
  if (!value || typeof value !== "object") throw new Error("Invalid desktop command")
  const command = value as Record<string, unknown>
  const type = text(command.type, "type", 64)
  if (updaterCommands.has(type)) {
    if (Object.keys(command).some((key) => key !== "type")) throw new Error("Updater commands do not accept a payload")
    return { type } as DesktopCommand
  }
  if (noPayload.has(type)) return { type } as DesktopCommand
  if (tabOnly.has(type)) return { type, tabId: text(command.tabId, "tabId", 128) } as DesktopCommand
  if (type === "capsule.create") return { type, name: text(command.name, "name", 80), kind: choice(command.kind, ["human", "agent"]), policy: choice(command.policy, ["human", "agent-safe", "agent-full"]) }
  if (type === "capsule.delegate" || type === "agent.policy") return { type, capsuleId: text(command.capsuleId, "capsuleId", 128), policy: choice(command.policy, type === "capsule.delegate" ? ["agent-safe", "agent-full"] : ["human", "agent-safe", "agent-full"]) } as DesktopCommand
  if (type === "tab.open") return { type, capsuleId: text(command.capsuleId, "capsuleId", 128), input: text(command.input, "input", 8_192) }
  if (type === "tab.list") return { type, capsuleId: text(command.capsuleId, "capsuleId", 128) }
  if (type === "tab.navigate") return { type, tabId: text(command.tabId, "tabId", 128), input: text(command.input, "input", 8_192) }
  if (type === "page.find") return { type, tabId: text(command.tabId, "tabId", 128), text: text(command.text, "text", 4_096) }
  if (type === "page.click") return { type, tabId: text(command.tabId, "tabId", 128), ref: text(command.ref, "ref", 32) }
  if (type === "page.type") return { type, tabId: text(command.tabId, "tabId", 128), ref: text(command.ref, "ref", 32), text: text(command.text, "text", 100_000, true) }
  if (type === "page.download") return { type, tabId: text(command.tabId, "tabId", 128), url: text(command.url, "url", 8_192) }
  if (type === "library.search") return { type, capsuleId: text(command.capsuleId, "capsuleId", 128), query: text(command.query, "query", 1_024) }
  const capsuleId = command.capsuleId === undefined ? undefined : text(command.capsuleId, "capsuleId", 128)
  if (type === "file.read") return { type, projectId: text(command.projectId, "projectId", 128), path: text(command.path, "path", 1_024), capsuleId }
  if (type === "file.write") return { type, projectId: text(command.projectId, "projectId", 128), path: text(command.path, "path", 1_024), content: text(command.content, "content", 2 * 1024 * 1024, true), expectedVersion: text(command.expectedVersion, "expectedVersion", 128), capsuleId }
  throw new Error(`Unsupported desktop command: ${type}`)
}

function text(value: unknown, field: string, max: number, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.trim())) throw new Error(`Invalid ${field}`)
  return value
}

function choice<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new Error("Invalid command choice")
  return value as T
}
