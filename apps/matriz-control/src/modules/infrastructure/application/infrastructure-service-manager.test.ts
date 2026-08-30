import { describe, expect, it, vi } from "vitest"
import {
  InfrastructureServiceManager,
  type InfrastructureHost,
  type NativeServiceInspection,
} from "./infrastructure-service-manager"
import { MATRIZ_SERVICE_CATALOG } from "../domain/service-catalog"
import type { MatrizServiceDefinition } from "../domain/service-catalog"

function host(inspections: Partial<Record<"postgres" | "garnet" | "nats", NativeServiceInspection>> = {}): InfrastructureHost {
  return {
    inspect: vi.fn(async (service: MatrizServiceDefinition) => inspections[service.id] ?? { exists: false, running: false, imagePath: null, startMode: null }),
    execute: vi.fn(async () => undefined),
    readLogs: vi.fn(async () => ["ready password=secret", "postgres://user:secret@127.0.0.1:55432/matriz"]),
  }
}

describe("Matriz infrastructure service manager", () => {
  it("owns exactly the fixed loopback service topology", () => {
    expect(MATRIZ_SERVICE_CATALOG.map(({ id, serviceName, ports }) => ({ id, serviceName, ports }))).toEqual([
      { id: "postgres", serviceName: "MatrizPostgres17", ports: [55432] },
      { id: "garnet", serviceName: "MatrizGarnet", ports: [46379] },
      { id: "nats", serviceName: "MatrizNats", ports: [54222, 58222] },
    ])
    expect(MATRIZ_SERVICE_CATALOG.flatMap((service) => service.ports)).not.toContain(5432)
    expect(MATRIZ_SERVICE_CATALOG.every((service) => service.host === "127.0.0.1")).toBe(true)
  })

  it("reports a same-name service outside the managed root as external and refuses mutation", async () => {
    const external = host({ postgres: { exists: true, running: true, imagePath: "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_ctl.exe", startMode: "auto" } })
    const manager = new InfrastructureServiceManager({ host: external, programData: "C:\\ProgramData", now: () => 1_000, token: () => "token_1" })
    expect((await manager.status()).services[0]?.state).toBe("external_unowned")
    await expect(manager.preview("postgres", "stop")).rejects.toThrow(/not owned/i)
    expect(external.execute).not.toHaveBeenCalled()
  })

  it("distinguishes SCM startup and a running service that fails its loopback probe", async () => {
    const native = host({
      postgres: { exists: true, running: false, imagePath: "C:\\ProgramData\\Matriz\\Infrastructure\\postgres\\data", startMode: "delayed-auto", nativeState: "start_pending", healthy: null },
      garnet: { exists: true, running: true, imagePath: "C:\\ProgramData\\Matriz\\Infrastructure\\garnet\\Garnet.worker.exe", startMode: "delayed-auto", nativeState: "running", healthy: false },
    })
    const manager = new InfrastructureServiceManager({ host: native, programData: "C:\\ProgramData", now: () => 1_000, token: () => "token" })
    const snapshot = await manager.status()
    expect(snapshot.services.find((service) => service.id === "postgres")?.state).toBe("starting")
    expect(snapshot.services.find((service) => service.id === "garnet")?.state).toBe("degraded")
  })

  it("binds a short-lived confirmation token to one action and consumes it once", async () => {
    let now = 1_000
    const native = host({ postgres: { exists: true, running: false, imagePath: "C:\\ProgramData\\Matriz\\Infrastructure\\postgres\\bin\\pg_ctl.exe", startMode: "delayed-auto" } })
    const manager = new InfrastructureServiceManager({ host: native, programData: "C:\\ProgramData", now: () => now, token: () => "token_1" })
    const preview = await manager.preview("postgres", "start")
    expect(preview).toMatchObject({ confirmationToken: "token_1", serviceId: "postgres", actionId: "start", expiresAt: 31_000 })
    await manager.confirm("token_1")
    expect(native.execute).toHaveBeenCalledWith(MATRIZ_SERVICE_CATALOG[0], "start")
    await expect(manager.confirm("token_1")).rejects.toThrow(/invalid or already used/i)

    const expiring = new InfrastructureServiceManager({ host: native, programData: "C:\\ProgramData", now: () => now, token: () => "token_2" })
    await expiring.preview("postgres", "start")
    now = 31_001
    await expect(expiring.confirm("token_2")).rejects.toThrow(/expired/i)
  })

  it("sanitizes and bounds logs before returning them to the renderer", async () => {
    const native = host()
    native.readLogs = vi.fn(async () => Array.from({ length: 400 }, (_, index) => `line ${index} password=hunter2 https://user:secret@example.test/private?token=abc`))
    const manager = new InfrastructureServiceManager({ host: native, programData: "C:\\ProgramData", now: () => 1_000, token: () => "token" })
    const logs = await manager.logs("nats")
    expect(logs).toHaveLength(200)
    expect(logs.join("\n")).not.toContain("hunter2")
    expect(logs.join("\n")).not.toContain("user:secret")
    expect(logs.join("\n")).not.toContain("token=abc")
  })
})
