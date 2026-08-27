import { afterEach, describe, expect, it, vi } from "vitest"
import type { SystemHealthVM } from "./presenters/system-health-presenter"
import { createHealthPoller, toControlHostTabsMetric, toHealthDashboardStatus } from "./health-dashboard"

const view: SystemHealthVM = {
  sampledAt: "25/08, 12:03:04",
  cpu: { label: "CPU", value: "24,0%", detail: "Uso atual do processador", percent: 24, tone: "healthy" },
  memory: { label: "Memória", value: "4,0 GB / 16,0 GB", detail: "25,0% em uso", percent: 25, tone: "healthy" },
  temperature: { label: "Temperatura", value: "42,0 °C", detail: "Sensor do sistema", percent: null, tone: "healthy" },
  uptime: { label: "Atividade", value: "2h 3min", detail: "Tempo desde a última inicialização", percent: null, tone: "healthy" },
  processes: [],
}

afterEach(() => {
  vi.useRealTimers()
})

describe("health polling", () => {
  it("shows the Control Desktop availability copy until a valid tab snapshot arrives", () => {
    expect(toControlHostTabsMetric(null)).toEqual({
      label: "Guias do Control",
      value: "Disponível no Matriz Control Desktop",
      detail: "Abra o Health no Control Desktop para ler as guias.",
      percent: null,
      tone: "unavailable",
    })
    expect(toControlHostTabsMetric({ version: "v1", sampledAt: "2026-08-25T12:00:00.000Z", openTabs: 3, suspendedTabs: 1 })).toEqual({
      label: "Guias do Control",
      value: "3 abertas",
      detail: "1 suspensa",
      percent: null,
      tone: "healthy",
    })
  })

  it("presents an explicit unavailable state when the first read fails", async () => {
    vi.useFakeTimers()
    const read = vi.fn<() => Promise<SystemHealthVM>>().mockRejectedValue(new Error("offline"))
    const states: Array<{ readonly view: SystemHealthVM | null; readonly stale: boolean }> = []
    const poller = createHealthPoller({
      read,
      isVisible: () => true,
      subscribeToVisibility: () => () => undefined,
      onStateChange: (state) => states.push(state),
    })

    poller.start()
    await vi.advanceTimersByTimeAsync(0)

    expect(states.at(-1)).toEqual({ view: null, stale: true })
    expect(toHealthDashboardStatus(states.at(-1)!)).toEqual({
      title: "Leitura indisponível",
      message: "Tentando reconectar ao sensor local…",
    })
    poller.stop()
  })

  it("fetches only while visible and resumes when the tab becomes visible", async () => {
    vi.useFakeTimers()
    const read = vi.fn<() => Promise<SystemHealthVM>>().mockResolvedValue(view)
    let visible = true
    let onVisibilityChange: (() => void) | undefined
    const poller = createHealthPoller({
      read,
      isVisible: () => visible,
      subscribeToVisibility: (listener) => {
        onVisibilityChange = listener
        return () => undefined
      },
      onStateChange: () => undefined,
    })

    poller.start()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(read).toHaveBeenCalledTimes(2)

    visible = false
    onVisibilityChange?.()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(read).toHaveBeenCalledTimes(2)

    visible = true
    onVisibilityChange?.()
    await vi.advanceTimersByTimeAsync(0)
    expect(read).toHaveBeenCalledTimes(3)
    poller.stop()
  })

  it("keeps the last good state and backs failed reads off to two then five seconds", async () => {
    vi.useFakeTimers()
    const read = vi
      .fn<() => Promise<SystemHealthVM>>()
      .mockResolvedValueOnce(view)
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
    const states: Array<{ readonly view: SystemHealthVM | null; readonly stale: boolean }> = []
    const poller = createHealthPoller({
      read,
      isVisible: () => true,
      subscribeToVisibility: () => () => undefined,
      onStateChange: (state) => states.push(state),
    })

    poller.start()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(states.at(-1)).toEqual({ view, stale: true })

    await vi.advanceTimersByTimeAsync(1_999)
    expect(read).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(read).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(4_999)
    expect(read).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1)
    expect(read).toHaveBeenCalledTimes(4)
    poller.stop()
  })
})
