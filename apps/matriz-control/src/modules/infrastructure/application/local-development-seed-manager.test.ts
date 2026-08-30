import { describe, expect, it, vi } from "vitest"
import { LocalDevelopmentSeedManager } from "./local-development-seed-manager"

describe("LocalDevelopmentSeedManager", () => {
  it("requires healthy services and clean migrations before issuing a one-time confirmation", async () => {
    const execute = vi.fn(async () => undefined)
    const manager = new LocalDevelopmentSeedManager({
      host: { prerequisites: async () => ({ servicesHealthy: true, migrationsClean: true, workspaceAvailable: true }), execute },
      now: () => 1_000,
      token: () => "seed_confirm_1",
    })

    await expect(manager.preview()).resolves.toEqual({
      confirmationToken: "seed_confirm_1",
      expiresAt: 301_000,
      title: "Popular ambiente local Matriz",
      impact: [
        "Cria ou atualiza fixtures locais idempotentes nos oito schemas.",
        "Registra clientes OIDC locais usando apenas fingerprints no Core.",
        "Cria credenciais locais do Identity; senhas permanecem no vault do Control.",
      ],
    })
    await expect(manager.confirm("seed_confirm_1")).resolves.toEqual({ state: "ready", message: "Ambiente local populado e credenciais do Identity sincronizadas." })
    expect(execute).toHaveBeenCalledTimes(1)
    await expect(manager.confirm("seed_confirm_1")).rejects.toThrow(/invalid or already used/i)
  })

  it.each([
    [{ servicesHealthy: false, migrationsClean: true, workspaceAvailable: true }, /services/i],
    [{ servicesHealthy: true, migrationsClean: false, workspaceAvailable: true }, /migrations/i],
    [{ servicesHealthy: true, migrationsClean: true, workspaceAvailable: false }, /workspace/i],
  ])("fails closed when a prerequisite is missing", async (prerequisites, expected) => {
    const manager = new LocalDevelopmentSeedManager({ host: { prerequisites: async () => prerequisites, execute: async () => undefined }, now: Date.now, token: () => "token" })
    await expect(manager.preview()).rejects.toThrow(expected)
  })

  it("expires a preview and rechecks prerequisites at confirmation time", async () => {
    let now = 10
    let healthy = true
    const execute = vi.fn(async () => undefined)
    const manager = new LocalDevelopmentSeedManager({
      host: { prerequisites: async () => ({ servicesHealthy: healthy, migrationsClean: true, workspaceAvailable: true }), execute },
      now: () => now,
      token: () => "token",
    })
    await manager.preview()
    healthy = false
    await expect(manager.confirm("token")).rejects.toThrow(/services/i)
    expect(execute).not.toHaveBeenCalled()
    healthy = true
    await manager.preview()
    now += 300_001
    await expect(manager.confirm("token")).rejects.toThrow(/expired/i)
  })
})
