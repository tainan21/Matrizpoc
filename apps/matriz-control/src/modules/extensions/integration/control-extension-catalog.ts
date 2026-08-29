import type { ExtensionDefinition } from "../domain/extension-registry"

export const CONTROL_EXTENSION_DEFINITIONS: readonly ExtensionDefinition[] = [{
  id: "health",
  name: "Health Monitor",
  version: "0.1.0",
  minimumControlVersion: "0.1.0",
  publisher: "Matriz",
  description: "Observabilidade local, somente leitura, do computador.",
  permissions: ["system.metrics.read"],
  dependencies: [],
  contributions: {
    navigation: [{ id: "system-health", appId: "health", label: "System Health", items: [{ id: "overview", label: "Overview", path: "/" }, { id: "resources", label: "Resources", path: "/resources" }] }],
    widgets: [{ id: "health.widget.system", label: "System Health" }],
    doctorProviders: ["health.system.observe"],
  },
}]
