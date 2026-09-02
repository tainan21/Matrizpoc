import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type { TerminalEvent, TerminalSession } from "../../domain/types"
import { useTerminalRuntime } from "./use-terminal-runtime"

const runningSession: TerminalSession = {
  id: "shell-a",
  title: "PowerShell 7",
  kind: "shell",
  status: "running",
  cwd: "C:\\workspace",
  tail: "",
}

describe("terminal lifecycle", () => {
  it("refuses shell creation until native readiness confirms a workspace", async () => {
    const gateway = {
      terminalReadiness: vi.fn().mockResolvedValue({
        ready: false,
        conptyAvailable: true,
        sessionCount: 0,
        sessionLimit: 6,
        reason: "Matriz workspace has not been selected",
      }),
      listTerminals: vi.fn().mockResolvedValue([]),
      subscribeTerminal: vi.fn().mockResolvedValue(undefined),
      createTerminal: vi.fn(),
    } as unknown as DesktopGateway
    const { result } = renderHook(() => useTerminalRuntime(gateway))

    await waitFor(() => expect(result.current.readiness?.ready).toBe(false))
    await act(async () => { await result.current.create() })

    expect(gateway.createTerminal).not.toHaveBeenCalled()
    expect(result.current.error).toBe("Matriz workspace has not been selected")
  })

  it("refreshes readiness after workspace selection and creates only on the next explicit action", async () => {
    const blocked = {
      ready: false,
      conptyAvailable: true,
      sessionCount: 0,
      sessionLimit: 6,
      reason: "Matriz workspace has not been selected",
    }
    const ready = {
      ready: true,
      workspacePath: "C:\\workspace",
      shellPath: "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
      shellLabel: "PowerShell 7",
      conptyAvailable: true,
      sessionCount: 0,
      sessionLimit: 6,
    }
    const gateway = {
      terminalReadiness: vi.fn().mockResolvedValueOnce(blocked).mockResolvedValue(ready),
      listTerminals: vi.fn().mockResolvedValue([]),
      subscribeTerminal: vi.fn().mockResolvedValue(undefined),
      createTerminal: vi.fn().mockResolvedValue(runningSession),
    } as unknown as DesktopGateway
    const { result } = renderHook(() => useTerminalRuntime(gateway))

    await waitFor(() => expect(result.current.readiness?.ready).toBe(false))
    await act(async () => { await result.current.refreshReadiness() })

    expect(result.current.readiness).toEqual(ready)
    expect(gateway.createTerminal).not.toHaveBeenCalled()

    await act(async () => { await result.current.create() })
    expect(gateway.createTerminal).toHaveBeenCalledOnce()
    expect(result.current.state.sessions).toContainEqual(runningSession)
  })

  it("does not resurrect a closed session when its exit event arrives late", async () => {
    let listener: ((event: TerminalEvent) => void) | undefined
    const gateway = {
      listTerminals: vi.fn().mockResolvedValue([runningSession]),
      subscribeTerminal: vi.fn(async (next) => {
        listener = next
      }),
      closeTerminal: vi.fn().mockResolvedValue(undefined),
    } as unknown as DesktopGateway
    const { result } = renderHook(() => useTerminalRuntime(gateway))

    await act(async () => Promise.resolve())
    expect(result.current.state.sessions).toHaveLength(1)

    await act(async () => {
      await result.current.close(runningSession.id)
      listener?.({
        event: "state",
        data: { ...runningSession, status: "failed", exitCode: 1 },
      })
    })

    expect(result.current.state.sessions).toEqual([])
  })

  it("removes a managed session closed by a runtime action", async () => {
    let listener: ((event: TerminalEvent) => void) | undefined
    const gateway = {
      listTerminals: vi.fn().mockResolvedValue([{ ...runningSession, id: "managed-a", kind: "managed" }]),
      subscribeTerminal: vi.fn(async (next) => { listener = next }),
    } as unknown as DesktopGateway
    const { result } = renderHook(() => useTerminalRuntime(gateway))

    await act(async () => Promise.resolve())
    await act(async () => listener?.({ event: "closed", data: { sessionId: "managed-a" } }))

    expect(result.current.state.sessions).toEqual([])
  })

  it("keeps terminal lifecycle failures visible inside the terminal", async () => {
    const gateway = {
      terminalReadiness: vi.fn().mockResolvedValue({
        ready: true,
        workspacePath: "C:\\workspace",
        shellPath: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        shellLabel: "Windows PowerShell",
        conptyAvailable: true,
        sessionCount: 1,
        sessionLimit: 6,
      }),
      listTerminals: vi.fn().mockResolvedValue([runningSession]),
      subscribeTerminal: vi.fn().mockResolvedValue(undefined),
      interruptTerminal: vi.fn().mockRejectedValue(new Error("ConPTY recusou Ctrl+C")),
      closeTerminal: vi.fn().mockRejectedValue(new Error("Falha ao liberar o processo")),
    } as unknown as DesktopGateway
    const { result } = renderHook(() => useTerminalRuntime(gateway))

    await waitFor(() => expect(result.current.state.sessions).toHaveLength(1))
    await act(async () => { await expect(result.current.interrupt(runningSession.id)).rejects.toThrow("ConPTY recusou Ctrl+C") })
    expect(result.current.error).toBe("ConPTY recusou Ctrl+C")

    await act(async () => { await expect(result.current.close(runningSession.id)).rejects.toThrow("Falha ao liberar o processo") })
    expect(result.current.error).toBe("Falha ao liberar o processo")
    expect(result.current.state.sessions).toHaveLength(1)

    act(() => result.current.reportError(new Error("xterm não carregou")))
    expect(result.current.error).toBe("xterm não carregou")
  })
})
