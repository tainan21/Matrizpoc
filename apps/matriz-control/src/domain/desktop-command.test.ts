import { describe, expect, it } from "vitest"
import { assertAgentDesktopCommand, parseDesktopCommand } from "./desktop-bridge"

describe("parseDesktopCommand", () => {
  it("accepts only the closed desktop command surface", () => {
    expect(parseDesktopCommand({ type: "tab.navigate", tabId: "tab_1", input: "example.com" })).toEqual({ type: "tab.navigate", tabId: "tab_1", input: "example.com" })
    expect(() => parseDesktopCommand({ type: "shell.run", command: "whoami" })).toThrow(/unsupported/i)
    expect(() => parseDesktopCommand({ type: "page.type", tabId: "tab_1", ref: "m1", text: "x".repeat(100_001) })).toThrow(/invalid/i)
  })

  it("accepts the read-only host health snapshot command without a payload", () => {
    expect(parseDesktopCommand({ type: "health.host-snapshot", ignored: "value" }))
      .toEqual({ type: "health.host-snapshot" })
    expect(() => parseDesktopCommand({ type: "health.host-snapshot-v2" })).toThrow(/unsupported/i)
  })

  it.each(["update.status", "update.check", "update.download", "update.install"])("accepts payload-free %s", (type) => {
    expect(parseDesktopCommand({ type })).toEqual({ type })
  })

  it.each(["update.status", "update.check", "update.download", "update.install"])("rejects payload on %s", (type) => {
    expect(() => parseDesktopCommand({ type, url: "https://evil.example" })).toThrow(/payload/i)
  })

  it("keeps updater commands out of the MCP command surface", () => {
    expect(() => assertAgentDesktopCommand({ type: "update.check" })).toThrow(/human interface/i)
  })

  it("accepts Store app operations with only a catalog app id and keeps them out of MCP", () => {
    expect(() => parseDesktopCommand({ type: "store.apps.status", path: "C:/ignored" })).toThrow(/payload/i)
    expect(() => parseDesktopCommand({ type: "store.app.download", appId: "matriz-workbench", url: "https://evil.example" })).toThrow(/payload/i)
    expect(() => parseDesktopCommand({ type: "store.app.cancel-download", appId: "seumei", command: "whoami" })).toThrow(/payload/i)
    expect(parseDesktopCommand({ type: "store.app.install", appId: "seumei" })).toEqual({ type: "store.app.install", appId: "seumei" })
    expect(parseDesktopCommand({ type: "store.app.install", appId: "matriz-uninstall" })).toEqual({ type: "store.app.install", appId: "matriz-uninstall" })
    expect(parseDesktopCommand({ type: "store.app.open", appId: "seumei" })).toEqual({ type: "store.app.open", appId: "seumei" })
    expect(parseDesktopCommand({ type: "store.app.uninstall", appId: "seumei" })).toEqual({ type: "store.app.uninstall", appId: "seumei" })
    expect(parseDesktopCommand({ type: "store.app.check-update", appId: "seumei" })).toEqual({ type: "store.app.check-update", appId: "seumei" })
    expect(() => parseDesktopCommand({ type: "store.app.download", appId: "unknown" })).toThrow(/invalid/i)
    expect(() => assertAgentDesktopCommand({ type: "store.app.install", appId: "seumei" })).toThrow(/human interface/i)
  })

  it("accepts only ID-based Project Host intents and rejects execution material", () => {
    expect(parseDesktopCommand({ type: "project.pick-root" })).toEqual({ type: "project.pick-root" })
    expect(parseDesktopCommand({ type: "project.inspect", projectId: "project_1" })).toEqual({ type: "project.inspect", projectId: "project_1" })
    expect(parseDesktopCommand({ type: "project.approve", projectId: "project_1", recipeRevision: "rev_1" })).toEqual({ type: "project.approve", projectId: "project_1", recipeRevision: "rev_1" })
    expect(parseDesktopCommand({ type: "project.prepare.preview", projectId: "project_1", recipeRevision: "rev_1" })).toEqual({ type: "project.prepare.preview", projectId: "project_1", recipeRevision: "rev_1" })
    expect(parseDesktopCommand({ type: "project.prepare", projectId: "project_1", recipeRevision: "rev_1", confirmationToken: "confirmation_1" })).toEqual({ type: "project.prepare", projectId: "project_1", recipeRevision: "rev_1", confirmationToken: "confirmation_1" })
    expect(parseDesktopCommand({ type: "project.start", projectId: "project_1", actionId: "run.dev", recipeRevision: "rev_1" })).toEqual({ type: "project.start", projectId: "project_1", actionId: "run.dev", recipeRevision: "rev_1" })
    expect(parseDesktopCommand({ type: "project.stop", projectId: "project_1", sessionId: "term_1" })).toEqual({ type: "project.stop", projectId: "project_1", sessionId: "term_1" })
    expect(parseDesktopCommand({ type: "project.restart", projectId: "project_1", sessionId: "term_1" })).toEqual({ type: "project.restart", projectId: "project_1", sessionId: "term_1" })
    expect(parseDesktopCommand({ type: "project.open", projectId: "project_1", surfaceId: "web" })).toEqual({ type: "project.open", projectId: "project_1", surfaceId: "web" })
    expect(parseDesktopCommand({ type: "project.remove", projectId: "project_1" })).toEqual({ type: "project.remove", projectId: "project_1" })
    for (const forbidden of ["path", "command", "args", "env", "port", "url"]) {
      expect(() => parseDesktopCommand({ type: "project.start", projectId: "project_1", actionId: "run.dev", recipeRevision: "rev_1", [forbidden]: "attacker" })).toThrow(/payload/i)
    }
  })

  it("keeps Project Host mutation out of the agent command surface", () => {
    expect(() => assertAgentDesktopCommand({ type: "project.remove", projectId: "project_1" })).toThrow(/human interface/i)
    expect(() => assertAgentDesktopCommand({ type: "project.start", projectId: "project_1", actionId: "run.dev", recipeRevision: "rev_1" })).toThrow(/human interface/i)
  })

  it("accepts only catalog-backed infrastructure intents", () => {
    expect(parseDesktopCommand({ type: "infrastructure.status" })).toEqual({ type: "infrastructure.status" })
    expect(parseDesktopCommand({ type: "infrastructure.logs", serviceId: "postgres" })).toEqual({ type: "infrastructure.logs", serviceId: "postgres" })
    expect(parseDesktopCommand({ type: "infrastructure.action.preview", serviceId: "stack", actionId: "install" }))
      .toEqual({ type: "infrastructure.action.preview", serviceId: "stack", actionId: "install" })
    expect(parseDesktopCommand({ type: "infrastructure.action.confirm", confirmationToken: "confirm_1" }))
      .toEqual({ type: "infrastructure.action.confirm", confirmationToken: "confirm_1" })

    for (const forbidden of ["path", "command", "args", "url", "port", "serviceName"]) {
      expect(() => parseDesktopCommand({
        type: "infrastructure.action.preview",
        serviceId: "postgres",
        actionId: "start",
        [forbidden]: "attacker",
      })).toThrow(/payload/i)
    }
    expect(() => parseDesktopCommand({ type: "infrastructure.action.preview", serviceId: "external", actionId: "stop" })).toThrow(/choice/i)
    expect(() => parseDesktopCommand({ type: "infrastructure.action.preview", serviceId: "postgres", actionId: "destroy" })).toThrow(/choice/i)
  })

  it("keeps every infrastructure command out of the agent command surface", () => {
    expect(() => assertAgentDesktopCommand({ type: "infrastructure.status" })).toThrow(/human interface/i)
    expect(() => assertAgentDesktopCommand({ type: "infrastructure.logs", serviceId: "nats" })).toThrow(/human interface/i)
  })

  it("accepts database recovery only by catalog id", () => {
    expect(parseDesktopCommand({ type: "infrastructure.database.backups" })).toEqual({ type: "infrastructure.database.backups" })
    expect(parseDesktopCommand({ type: "infrastructure.database.migrations" })).toEqual({ type: "infrastructure.database.migrations" })
    expect(parseDesktopCommand({ type: "infrastructure.database.recovery.preview", actionId: "backup" }))
      .toEqual({ type: "infrastructure.database.recovery.preview", actionId: "backup", backupId: null })
    expect(parseDesktopCommand({ type: "infrastructure.database.recovery.preview", actionId: "restore", backupId: "backup_20260830_ab12cd" }))
      .toEqual({ type: "infrastructure.database.recovery.preview", actionId: "restore", backupId: "backup_20260830_ab12cd" })
    expect(() => parseDesktopCommand({ type: "infrastructure.database.recovery.preview", actionId: "restore", backupId: "C:\\attacker.dump" })).toThrow(/backupId/i)
    expect(() => parseDesktopCommand({ type: "infrastructure.database.recovery.preview", actionId: "restore", backupId: "backup_20260830_ab12cd", path: "C:\\attacker.dump" })).toThrow(/payload/i)
    expect(() => assertAgentDesktopCommand({ type: "infrastructure.database.backups" })).toThrow(/human interface/i)
  })

})
