import { describe, expect, it } from "vitest"
import { localE2eBootstrapPath } from "./local-e2e-bootstrap"

describe("localE2eBootstrapPath", () => {
  it("inicia a sessão de prova somente no perfil local explicitamente habilitado", () => {
    expect(localE2eBootstrapPath({
      MATRIZ_RUNTIME_PROFILE: "local",
      OPS_E2E_ENABLED: "true",
      OPS_E2E_SESSION_TOKEN: "session-token",
    })).toBe("/api/e2e/session")
  })

  it.each([
    [{ MATRIZ_RUNTIME_PROFILE: "cloud", OPS_E2E_ENABLED: "true", OPS_E2E_SESSION_TOKEN: "session-token" }],
    [{ MATRIZ_RUNTIME_PROFILE: "local", OPS_E2E_ENABLED: "false", OPS_E2E_SESSION_TOKEN: "session-token" }],
    [{ MATRIZ_RUNTIME_PROFILE: "local", OPS_E2E_ENABLED: "true" }],
  ])("nunca oferece bootstrap fora da combinação local protegida", (environment) => {
    expect(localE2eBootstrapPath(environment)).toBeNull()
  })
})
