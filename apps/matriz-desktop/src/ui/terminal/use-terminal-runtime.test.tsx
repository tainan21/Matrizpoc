import { act, renderHook } from "@testing-library/react"
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
})
