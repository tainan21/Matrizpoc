import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DesktopGateway } from "../application/desktop-gateway"
import { useDesktop } from "./use-desktop"

afterEach(() => vi.useRealTimers())

describe("desktop operational feedback", () => {
  it("does not let background port polling erase an action failure", async () => {
    vi.useFakeTimers()
    const gateway = {
      snapshot: vi.fn().mockResolvedValue({ snapshotId: "observed", ports: [] }),
      readSettings: vi.fn().mockResolvedValue({
        theme: "matriz",
        closeToTray: true,
        soundsEnabled: false,
        volume: 0.45,
        startWithWindows: false,
        terminalDockOpen: false,
        terminalDockHeight: 280,
      }),
    } as unknown as DesktopGateway
    const { result } = renderHook(() => useDesktop(gateway))
    await act(async () => Promise.resolve())

    await act(async () => {
      await expect(
        result.current.execute(() => Promise.reject(new Error("Terminal indisponível")), "ok"),
      ).rejects.toThrow("Terminal indisponível")
    })
    expect(result.current.message).toBe("Terminal indisponível")

    await act(async () => vi.advanceTimersByTimeAsync(5_000))
    expect(gateway.snapshot).toHaveBeenCalledTimes(2)
    expect(result.current.message).toBe("Terminal indisponível")
  })
})
