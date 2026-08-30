import type { AgentPolicy, BrowserTab, Capsule } from "./browser"
import type { BrowserCommand } from "../application/browser-runtime"
import type { VaultStatus } from "../integration/browser/bitlocker-vault"
import type { WorkspaceFileSnapshot } from "../integration/browser/workspace-file-repository"
import type { ControlHostHealthSnapshot } from "../application/host-health-snapshot"
import type { ProjectRegistration } from "../modules/projects/domain/project"
import type { ProjectPreparationPreview } from "../modules/projects/application/project-preparation-service"
import type { ProjectViewModel } from "../modules/projects/presentation/project-presenter"
import type { InfrastructureActionPreview, InfrastructureSnapshot } from "../modules/infrastructure/domain/infrastructure"
import type { DatabaseBackupSnapshot, DatabaseRecoveryPreview } from "../modules/infrastructure/application/database-recovery-manager"
import type { MigrationGateStatus } from "../modules/infrastructure/application/database-migration-gate"
import type { LocalDevelopmentSeedPreview, LocalDevelopmentSeedResult } from "../modules/infrastructure/application/local-development-seed-manager"

export type DesktopUpdateState = "unavailable" | "idle" | "checking" | "available" | "downloading" | "downloaded" | "current" | "error"
export type DesktopUpdateSnapshot = {
  state: DesktopUpdateState
  currentVersion: string
  availableVersion: string | null
  progress: number | null
  notes: string | null
  message: string
}

export type StoreAppSnapshot = {
  appId: string
  kind: "activation" | "windows_installer"
  state: "unavailable" | "available" | "downloading" | "downloaded" | "cancelled" | "installing" | "installed" | "update_available" | "failed"
  version: string | null
  availableVersion: string | null
  bytesDownloaded: number
  totalBytes: number | null
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
  | { type: "update.status" | "update.check" | "update.download" | "update.install" }
  | { type: "store.apps.status" }
  | { type: "store.app.download" | "store.app.cancel-download" | "store.app.install" | "store.app.open" | "store.app.uninstall" | "store.app.check-update"; appId: "matriz-workbench" | "seumei" | "matriz-uninstall" }
  | { type: "project.pick-root" }
  | { type: "project.host.list" }
  | { type: "project.inspect"; projectId: string }
  | { type: "project.approve"; projectId: string; recipeRevision: string }
  | { type: "project.prepare.preview"; projectId: string; recipeRevision: string }
  | { type: "project.prepare"; projectId: string; recipeRevision: string; confirmationToken: string }
  | { type: "project.start"; projectId: string; actionId: string; recipeRevision: string }
  | { type: "project.stop" | "project.restart"; projectId: string; sessionId: string }
  | { type: "project.open"; projectId: string; surfaceId: string }
  | { type: "project.remove"; projectId: string }
  | { type: "infrastructure.status" }
  | { type: "infrastructure.logs"; serviceId: "postgres" | "garnet" | "nats" }
  | { type: "infrastructure.action.preview"; serviceId: "stack" | "postgres" | "garnet" | "nats"; actionId: "install" | "start" | "stop" | "restart" }
  | { type: "infrastructure.action.confirm"; confirmationToken: string }
  | { type: "infrastructure.database.backups" }
  | { type: "infrastructure.database.recovery.preview"; actionId: "backup" | "restore" | "recreate"; backupId: string | null }
  | { type: "infrastructure.database.recovery.confirm"; confirmationToken: string }
  | { type: "infrastructure.database.migrations" }
  | { type: "infrastructure.local.seed.preview" }
  | { type: "infrastructure.local.seed.confirm"; confirmationToken: string }

export type DesktopResult = Capsule | Capsule[] | BrowserTab | BrowserTab[] | VaultStatus | WorkspaceFileSnapshot | ControlHostHealthSnapshot | DesktopUpdateSnapshot | StoreAppSnapshot | readonly StoreAppSnapshot[] | ProjectRegistration | readonly ProjectRegistration[] | ProjectViewModel | readonly ProjectViewModel[] | ProjectPreparationPreview | InfrastructureSnapshot | InfrastructureActionPreview | DatabaseRecoveryPreview | readonly DatabaseBackupSnapshot[] | readonly MigrationGateStatus[] | LocalDevelopmentSeedPreview | LocalDevelopmentSeedResult | readonly string[] | { candidateId: string } | { state: string; sessionId?: string; readinessUrl?: string } | { available: true; version: string } | { id: string; name: string }[] | Array<{ kind: "bookmark" | "note"; title: string; url: string | null }> | { ok: true } | string | null

export type BrowserEvent =
  | { type: "tab.updated"; tab: BrowserTab }
  | { type: "tab.closed"; tabId: string }
  | { type: "download.updated"; id: string; filename: string; state: "progressing" | "completed" | "cancelled" | "failed" }
  | { type: "permission.requested"; capsuleId: string; origin: string; permission: string }
  | { type: "runtime.failed"; message: string }
  | { type: "update.updated"; snapshot: DesktopUpdateSnapshot }
  | { type: "store.updated"; snapshots: readonly StoreAppSnapshot[] }
  | { type: "project.updated"; projects: readonly ProjectViewModel[] }

export interface DesktopBridge {
  invoke(command: DesktopCommand): Promise<DesktopResult>
  subscribe(listener: (event: BrowserEvent) => void): () => void
  reportViewport(bounds: { x: number; y: number; width: number; height: number; visible: boolean }): void
}

const noPayload = new Set(["browser.status", "capsule.list", "project.list", "vault.status", "vault.provision", "vault.unlock", "vault.lock", "agent.kill", "health.host-snapshot"])
const updaterCommands = new Set(["update.status", "update.check", "update.download", "update.install"])
const storeAppCommands = new Set(["store.app.download", "store.app.cancel-download", "store.app.install", "store.app.open", "store.app.uninstall", "store.app.check-update"])
const tabOnly = new Set(["tab.activate", "tab.close", "tab.back", "tab.forward", "tab.reload", "page.screenshot", "page.pdf", "page.reader", "page.snapshot"])

export function parseDesktopCommand(value: unknown): DesktopCommand {
  if (!value || typeof value !== "object") throw new Error("Invalid desktop command")
  const command = value as Record<string, unknown>
  const type = text(command.type, "type", 64)
  if (updaterCommands.has(type)) {
    if (Object.keys(command).some((key) => key !== "type")) throw new Error("Updater commands do not accept a payload")
    return { type } as DesktopCommand
  }
  if (type === "store.apps.status") { assertOnlyKeys(command, ["type"], "Store status commands do not accept a payload"); return { type } }
  if (storeAppCommands.has(type)) { assertOnlyKeys(command, ["type", "appId"], "Store app command payload may contain only appId"); return { type, appId: choice(command.appId, ["matriz-workbench", "seumei", "matriz-uninstall"]) } as DesktopCommand }
  if (type === "project.pick-root" || type === "project.host.list") { assertOnlyKeys(command, ["type"], "Project command payload is invalid"); return { type } }
  if (type === "project.inspect" || type === "project.remove") { assertOnlyKeys(command, ["type", "projectId"], "Project command payload is invalid"); return { type, projectId: text(command.projectId, "projectId", 128) } as DesktopCommand }
  if (type === "project.approve" || type === "project.prepare.preview") { assertOnlyKeys(command, ["type", "projectId", "recipeRevision"], "Project command payload is invalid"); return { type, projectId: text(command.projectId, "projectId", 128), recipeRevision: text(command.recipeRevision, "recipeRevision", 128) } as DesktopCommand }
  if (type === "project.prepare") { assertOnlyKeys(command, ["type", "projectId", "recipeRevision", "confirmationToken"], "Project command payload is invalid"); return { type, projectId: text(command.projectId, "projectId", 128), recipeRevision: text(command.recipeRevision, "recipeRevision", 128), confirmationToken: text(command.confirmationToken, "confirmationToken", 256) } }
  if (type === "project.start") { assertOnlyKeys(command, ["type", "projectId", "actionId", "recipeRevision"], "Project command payload is invalid"); return { type, projectId: text(command.projectId, "projectId", 128), actionId: text(command.actionId, "actionId", 128), recipeRevision: text(command.recipeRevision, "recipeRevision", 128) } }
  if (type === "project.stop" || type === "project.restart") { assertOnlyKeys(command, ["type", "projectId", "sessionId"], "Project command payload is invalid"); return { type, projectId: text(command.projectId, "projectId", 128), sessionId: text(command.sessionId, "sessionId", 128) } }
  if (type === "project.open") { assertOnlyKeys(command, ["type", "projectId", "surfaceId"], "Project command payload is invalid"); return { type, projectId: text(command.projectId, "projectId", 128), surfaceId: text(command.surfaceId, "surfaceId", 128) } }
  if (type === "infrastructure.status") { assertOnlyKeys(command, ["type"], "Infrastructure command payload is invalid"); return { type } }
  if (type === "infrastructure.logs") { assertOnlyKeys(command, ["type", "serviceId"], "Infrastructure command payload is invalid"); return { type, serviceId: choice(command.serviceId, ["postgres", "garnet", "nats"]) } }
  if (type === "infrastructure.action.preview") { assertOnlyKeys(command, ["type", "serviceId", "actionId"], "Infrastructure command payload is invalid"); return { type, serviceId: choice(command.serviceId, ["stack", "postgres", "garnet", "nats"]), actionId: choice(command.actionId, ["install", "start", "stop", "restart"]) } }
  if (type === "infrastructure.action.confirm") { assertOnlyKeys(command, ["type", "confirmationToken"], "Infrastructure command payload is invalid"); return { type, confirmationToken: text(command.confirmationToken, "confirmationToken", 256) } }
  if (type === "infrastructure.database.backups") { assertOnlyKeys(command, ["type"], "Infrastructure database command payload is invalid"); return { type } }
  if (type === "infrastructure.database.recovery.preview") {
    assertOnlyKeys(command, ["type", "actionId", "backupId"], "Infrastructure database command payload is invalid")
    const actionId = choice(command.actionId, ["backup", "restore", "recreate"])
    const backupId = command.backupId === undefined || command.backupId === null ? null : text(command.backupId, "backupId", 64)
    if (backupId !== null && !/^backup_\d{8}_[a-z0-9]{6,32}$/.test(backupId)) throw new Error("Invalid backupId")
    return { type, actionId, backupId }
  }
  if (type === "infrastructure.database.recovery.confirm") { assertOnlyKeys(command, ["type", "confirmationToken"], "Infrastructure database command payload is invalid"); return { type, confirmationToken: text(command.confirmationToken, "confirmationToken", 256) } }
  if (type === "infrastructure.database.migrations") { assertOnlyKeys(command, ["type"], "Infrastructure database command payload is invalid"); return { type } }
  if (type === "infrastructure.local.seed.preview") { assertOnlyKeys(command, ["type"], "Infrastructure seed command payload is invalid"); return { type } }
  if (type === "infrastructure.local.seed.confirm") { assertOnlyKeys(command, ["type", "confirmationToken"], "Infrastructure seed command payload is invalid"); return { type, confirmationToken: text(command.confirmationToken, "confirmationToken", 256) } }
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

export function assertAgentDesktopCommand(command: DesktopCommand): void {
  if (command.type.startsWith("update.")) throw new Error("Updater commands require the human interface")
  if (command.type.startsWith("store.")) throw new Error("Store commands require the human interface")
  if (command.type.startsWith("project.") && command.type !== "project.list" && command.type !== "project.host.list") throw new Error("Project Host mutations require the human interface")
  if (command.type.startsWith("infrastructure.")) throw new Error("Infrastructure commands require the human interface")
}

function text(value: unknown, field: string, max: number, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.trim())) throw new Error(`Invalid ${field}`)
  return value
}

function choice<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T)) throw new Error("Invalid command choice")
  return value as T
}

function assertOnlyKeys(command: Record<string, unknown>, allowed: readonly string[], error: string) {
  if (Object.keys(command).some((key) => !allowed.includes(key))) throw new Error(error)
}
