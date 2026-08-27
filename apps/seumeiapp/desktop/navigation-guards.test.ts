import { describe, expect, it, vi } from "vitest"
import { attachNavigationGuards } from "./navigation-guards"

describe("attachNavigationGuards", () => {
  it("blocks a server redirect away from trusted origins", () => {
    const handlers = new Map<string, (...args: any[]) => void>()
    const preventDefault = vi.fn()
    const openExternal = vi.fn()
    attachNavigationGuards({ on: (name, handler) => handlers.set(name, handler), setWindowOpenHandler: vi.fn() }, ["https://seumei.example"], openExternal, vi.fn())
    handlers.get("will-redirect")?.({ preventDefault }, "https://evil.example/login")
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(openExternal).toHaveBeenCalledWith("https://evil.example/login")
  })

  it("shows the explicit offline page after a trusted main-frame load fails", () => {
    const handlers = new Map<string, (...args: any[]) => void>()
    const showOffline = vi.fn()
    attachNavigationGuards({ on: (name, handler) => handlers.set(name, handler), setWindowOpenHandler: vi.fn() }, ["https://seumei.example"], vi.fn(), showOffline)
    handlers.get("did-fail-load")?.({}, -106, "internet disconnected", "https://seumei.example/workspace", true)
    expect(showOffline).toHaveBeenCalledWith("Não foi possível alcançar o Seumei configurado.")
  })
})
