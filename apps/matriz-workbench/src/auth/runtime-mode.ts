export type WorkbenchRuntimeMode = "control-desktop" | "standalone-web" | "test"

interface RuntimeEnvironment {
  NODE_ENV?: string
  WORKBENCH_RUNTIME_MODE?: string
}

export function resolveWorkbenchRuntimeMode(
  environment: RuntimeEnvironment = process.env,
): WorkbenchRuntimeMode {
  if (environment.NODE_ENV === "test") return "test"
  return environment.WORKBENCH_RUNTIME_MODE === "control-desktop"
    ? "control-desktop"
    : "standalone-web"
}
