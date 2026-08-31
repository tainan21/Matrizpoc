import { describe, expect, it, vi } from "vitest"
import { WindowsOutboxDiagnostics } from "./windows-outbox-diagnostics"

describe("WindowsOutboxDiagnostics", () => {
  it("passes no schema or SQL from the renderer and validates fixed output", async () => {
    const execute = vi.fn(async (_file: string, _args: readonly string[]) => ({ stdout: JSON.stringify([
      { domain: "pay", pending: 1, oldestOccurredAt: null, retries: 0, deadLetters: 0, workerConfigured: true },
      { domain: "seumei", pending: 2, oldestOccurredAt: "2026-08-30 12:00:00+00", retries: 1, deadLetters: 0, workerConfigured: true },
      { domain: "hub", pending: 0, oldestOccurredAt: null, retries: 0, deadLetters: 1, workerConfigured: true },
    ]), stderr: "" }))
    const reader = new WindowsOutboxDiagnostics("C:/Matriz/outbox-diagnostics-helper.ps1", execute)
    await expect(reader.read()).resolves.toHaveLength(3)
    expect(execute.mock.calls[0]?.[1]).toEqual(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", "C:/Matriz/outbox-diagnostics-helper.ps1"])
  })

  it("rejects malformed or negative metrics", async () => {
    const reader = new WindowsOutboxDiagnostics("helper.ps1", async () => ({ stdout: '[{"domain":"hub","pending":-1}]' }))
    await expect(reader.read()).rejects.toThrow(/invalid outbox diagnostic/i)
  })
})
