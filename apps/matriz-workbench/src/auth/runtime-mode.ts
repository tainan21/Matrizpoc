export type WorkbenchRuntimeMode = "native-desktop" | "standalone-web" | "test"

interface RuntimeEnvironment {
  NODE_ENV?: string
  WORKBENCH_RUNTIME_MODE?: string
}

export function resolveWorkbenchRuntimeMode(
  environment: RuntimeEnvironment = process.env,
): WorkbenchRuntimeMode {
  if (environment.NODE_ENV === "test") return "test"
  return ["native-desktop", "control-desktop"].includes(environment.WORKBENCH_RUNTIME_MODE ?? "")
    ? "native-desktop"
    : "standalone-web"
}
