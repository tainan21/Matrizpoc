import { describe, expect, it } from "vitest"
import {
  activateExtension,
  createExtensionRegistry,
  deactivateExtension,
  installExtension,
  uninstallExtension,
  type ExtensionDefinition,
} from "./extension-registry"

const health: ExtensionDefinition = {
  id: "health",
  name: "Health",
  version: "0.1.0",
  minimumControlVersion: "0.1.0",
  publisher: "Matriz",
  description: "Observabilidade local do computador.",
  permissions: ["system.metrics.read"],
  dependencies: [],
  contributions: {
    navigation: [{ id: "system-health", label: "System Health", items: [{ id: "overview", label: "Overview", path: "/extensions/health/overview" }, { id: "resources", label: "Resources", path: "/extensions/health/resources" }] }],
    widgets: [{ id: "health.widget.system", label: "System Health" }],
    doctorProviders: ["health.system.observe"],
  },
}

describe("extension registry", () => {
  it("derives contributions only from compatible installed active extensions", () => {
    let registry = createExtensionRegistry([health], "0.1.0")
    expect(registry.contributions.navigation).toEqual([])

    registry = installExtension(registry, "health", ["system.metrics.read"], "2026-08-27T10:00:00.000Z")
    expect(registry.receipts[0]).toMatchObject({ id: "health", state: "installed-inactive" })
    expect(registry.contributions.widgets).toEqual([])

    registry = activateExtension(registry, "health", "2026-08-27T10:01:00.000Z")
    expect(registry.receipts[0].state).toBe("active")
    expect(registry.contributions.navigation[0].items).toHaveLength(2)
    expect(registry.contributions.doctorProviders).toEqual(["health.system.observe"])

    registry = deactivateExtension(registry, "health", "2026-08-27T10:02:00.000Z")
    expect(registry.contributions.navigation).toEqual([])

    registry = uninstallExtension(registry, "health")
    expect(registry.receipts).toEqual([])
  })

  it("rejects undeclared permission grants", () => {
    const registry = createExtensionRegistry([health], "0.1.0")
    expect(() => installExtension(registry, "health", ["system.metrics.write"], "2026-08-27T10:00:00.000Z")).toThrow("Undeclared extension permission")
  })
})
