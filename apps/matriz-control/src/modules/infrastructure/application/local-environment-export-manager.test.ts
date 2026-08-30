import { describe, expect, it, vi } from "vitest"
import { LocalEnvironmentExportManager, serializeDevelopmentEnvironment } from "./local-environment-export-manager"

describe("serializeDevelopmentEnvironment", () => {
  it("sorts keys and safely quotes multiline and structured values", () => {
    expect(serializeDevelopmentEnvironment({ Z_VALUE: "line\none", A_VALUE: "{\"key\":\"value\"}" })).toBe(
      "# Generated explicitly by Matriz Control. Do not commit.\nA_VALUE=\"{\\\"key\\\":\\\"value\\\"}\"\nZ_VALUE=\"line\\none\"\n",
    )
    expect(() => serializeDevelopmentEnvironment({ "BAD-NAME": "value" })).toThrow(/invalid environment key/i)
  })
})

describe("LocalEnvironmentExportManager", () => {
  it("previews an overwrite and consumes a one-time token", async () => {
    const write = vi.fn(async () => undefined)
    const manager = new LocalEnvironmentExportManager({
      host: { inspect: async () => ({ appId: "matriz-hub", targetExists: true, gitIgnored: true }), write },
      now: () => 100,
      token: () => "env_confirm_1",
    })
    await expect(manager.preview("matriz-hub")).resolves.toEqual({
      appId: "matriz-hub",
      confirmationToken: "env_confirm_1",
      expiresAt: 300_100,
      title: "Exportar ambiente local de matriz-hub",
      impact: ["Substitui o arquivo .env.development.local existente.", "Restringe o arquivo ao usuário Windows atual.", "O arquivo contém segredos locais e deve permanecer ignorado pelo Git."],
    })
    await expect(manager.confirm("env_confirm_1")).resolves.toEqual({ state: "exported", appId: "matriz-hub" })
    expect(write).toHaveBeenCalledWith("matriz-hub")
    await expect(manager.confirm("env_confirm_1")).rejects.toThrow(/invalid or already used/i)
  })

  it("refuses export when the destination is not ignored by Git", async () => {
    const manager = new LocalEnvironmentExportManager({
      host: { inspect: async () => ({ appId: "spot", targetExists: false, gitIgnored: false }), write: async () => undefined },
      now: Date.now,
      token: () => "token",
    })
    await expect(manager.preview("spot")).rejects.toThrow(/not ignored by Git/i)
  })
})
