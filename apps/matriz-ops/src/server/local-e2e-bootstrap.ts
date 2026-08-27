type LocalE2eEnvironment = Partial<Record<
  "MATRIZ_RUNTIME_PROFILE" | "OPS_E2E_ENABLED" | "OPS_E2E_SESSION_TOKEN",
  string
>>

export function localE2eBootstrapPath(environment: LocalE2eEnvironment): string | null {
  return environment.MATRIZ_RUNTIME_PROFILE === "local"
    && environment.OPS_E2E_ENABLED === "true"
    && Boolean(environment.OPS_E2E_SESSION_TOKEN)
    ? "/api/e2e/session"
    : null
}
