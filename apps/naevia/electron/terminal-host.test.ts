import { describe, expect, it, vi } from "vitest"
import { TerminalHost, terminalEnvironment, type TerminalProcess } from "./terminal-host.js"

function fakeProcess() {
  const listeners = new Map<string, (...args: unknown[]) => void>()
  const process: TerminalProcess = {
    pid: 42,
    write: vi.fn(),
    kill: vi.fn(),
    onOutput: (listener) => listeners.set("output", listener as (...args: unknown[]) => void),
    onExit: (listener) => listeners.set("exit", listener as (...args: unknown[]) => void),
  }
  return { process, output: (value: string) => listeners.get("output")?.(value), exit: (code: number | null) => listeners.get("exit")?.(code) }
}

describe("TerminalHost", () => {
  it("starts only on explicit create and bounds renderer input", () => {
    const child = fakeProcess()
    const spawn = vi.fn(() => child.process)
    const host = new TerminalHost(spawn)
    expect(spawn).not.toHaveBeenCalled()
    const session = host.create()
    expect(spawn).toHaveBeenCalledOnce()
    host.write(session.id, "Write-Output 'olá'\n")
    expect(child.process.write).toHaveBeenCalledWith("Write-Output 'olá'\n")
    expect(() => host.write(session.id, "x".repeat(4097))).toThrow("Entrada muito grande")
  })

  it("streams bounded output and closes every owned process", () => {
    const first = fakeProcess()
    const second = fakeProcess()
    const spawn = vi.fn().mockReturnValueOnce(first.process).mockReturnValueOnce(second.process)
    const host = new TerminalHost(spawn, { maxLines: 2 })
    const session = host.create()
    host.create()
    first.output("um\ndois\ntrês\n")
    expect(host.list().find(({ id }) => id === session.id)?.lines).toEqual(["dois", "três"])
    host.closeAll()
    expect(first.process.kill).toHaveBeenCalledOnce()
    expect(second.process.kill).toHaveBeenCalledOnce()
  })

  it("does not pass host secrets into the interactive shell", () => {
    expect(terminalEnvironment({ PATH: "bin", MATRIZ_TOKEN: "secret", DB_PASSWORD: "secret" })).toEqual({ PATH: "bin" })
  })
})
