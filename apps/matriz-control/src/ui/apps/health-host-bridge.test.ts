import { afterEach, describe, expect, it, vi } from "vitest"
import { createHealthHostBridge } from "./health-host-bridge"

afterEach(() => vi.useRealTimers())

describe("Health host bridge", () => {
  it("posts validated tab counts to the exact Health origin every second while visible", async () => {
    vi.useFakeTimers()
    const sent: Array<{ readonly message: unknown; readonly targetOrigin: string }> = []
    const bridge = createHealthHostBridge({
      invoke: async () => ({ version: "v1", sampledAt: "2026-08-25T12:00:00.000Z", openTabs: 3, suspendedTabs: 1 }),
      targetWindow: { postMessage: (message, targetOrigin) => sent.push({ message, targetOrigin }) },
      targetOrigin: "http://127.0.0.1:3010",
      isVisible: () => true,
      subscribeToVisibility: () => () => undefined,
    })

    bridge.start()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(1_000)

    expect(sent).toEqual([
      { message: { type: "matriz.control.health.v1", payload: { version: "v1", sampledAt: "2026-08-25T12:00:00.000Z", openTabs: 3, suspendedTabs: 1 } }, targetOrigin: "http://127.0.0.1:3010" },
      { message: { type: "matriz.control.health.v1", payload: { version: "v1", sampledAt: "2026-08-25T12:00:00.000Z", openTabs: 3, suspendedTabs: 1 } }, targetOrigin: "http://127.0.0.1:3010" },
    ])
    bridge.stop()
  })

  it("does not sample while hidden and resumes when visibility returns", async () => {
    vi.useFakeTimers()
    let visible = true
    let onVisibilityChange: (() => void) | undefined
    let reads = 0
    const bridge = createHealthHostBridge({
      invoke: async () => { reads += 1; return { version: "v1", sampledAt: "2026-08-25T12:00:00.000Z", openTabs: 0, suspendedTabs: 0 } },
      targetWindow: { postMessage: () => undefined },
      targetOrigin: "http://127.0.0.1:3010",
      isVisible: () => visible,
      subscribeToVisibility: (listener) => { onVisibilityChange = listener; return () => undefined },
    })

    bridge.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(reads).toBe(1)

    visible = false
    onVisibilityChange?.()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(reads).toBe(1)

    visible = true
    onVisibilityChange?.()
    await vi.advanceTimersByTimeAsync(0)
    expect(reads).toBe(2)
    bridge.stop()
  })

  it("does not forward malformed desktop results", async () => {
    vi.useFakeTimers()
    const sent: unknown[] = []
    const bridge = createHealthHostBridge({
      invoke: async () => ({ version: "v1", sampledAt: "invalid", openTabs: -1, suspendedTabs: 0 }),
      targetWindow: { postMessage: (message) => sent.push(message) },
      targetOrigin: "http://127.0.0.1:3010",
      isVisible: () => true,
      subscribeToVisibility: () => () => undefined,
    })

    bridge.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(sent).toEqual([])
    bridge.stop()
  })
})
