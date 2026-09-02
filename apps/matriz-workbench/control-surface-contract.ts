export const WORKBENCH_CONTROL_SURFACE = Object.freeze({
  appId: "matriz-workbench",
  contractVersion: "workbench-control-v1",
  routePath: "/control",
  healthPath: "/api/control/health",
  diagnosticsPath: "/api/control/diagnostics",
  embedding: "trusted-loopback-webview",
  capabilities: ["health", "diagnostics", "repairs", "coworking"],
} as const)

export type WorkbenchControlSurface = typeof WORKBENCH_CONTROL_SURFACE
