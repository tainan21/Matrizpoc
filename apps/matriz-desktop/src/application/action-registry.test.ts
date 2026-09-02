import { describe, expect, it, vi } from "vitest"

import type { RuntimeInstance } from "../domain/types"
import { APP_MANIFESTS } from "./app-manifests"
import { executeRuntimeAction, getRuntimeActions, type ActionServices } from "./action-registry"
import { MATRIZ_DESKTOP_APPS } from "./catalog"

const runtime = (overrides: Partial<RuntimeInstance> = {}): RuntimeInstance => ({
  id: "matriz-admin",
  label: "Matriz Admin",
  port: 3002,
  status: "ready",
  ownership: "managed",
  pid: 321,
  sessionId: "session-1",
  endpoint: "http://localhost:3002/",
  health: "healthy",
  ...overrides,
})

const ids = (value: RuntimeInstance) =>
  getRuntimeActions({ runtime: value, activeRoute: "/", previewOpen: false }).map(({ id }) => id)

describe("runtime action registry", () => {
  it("derives different safe actions from ownership and lifecycle", () => {
    expect(ids(runtime({ status: "stopped", ownership: "none", pid: undefined }))).toEqual([
      "runtime.start",
      "runtime.terminal",
    ])
    expect(ids(runtime())).toEqual([
      "runtime.open",
      "runtime.preview",
      "runtime.route",
      "runtime.copy-url",
      "runtime.restart",
      "runtime.stop",
      "runtime.terminal",
      "runtime.clear-terminal",
    ])
    expect(ids(runtime({ ownership: "external", sessionId: undefined }))).not.toContain(
      "runtime.stop",
    )
  })

  it("loads declared routes for every catalog app through public manifests", () => {
    expect(Object.keys(APP_MANIFESTS)).toHaveLength(MATRIZ_DESKTOP_APPS.length)
    for (const manifest of Object.values(APP_MANIFESTS)) {
      expect(manifest.routes.length).toBeGreaterThan(0)
      expect(manifest.routes[0]?.path.startsWith("/")).toBe(true)
    }
  })

  it("executes the same stable descriptor used by every surface", async () => {
    const services: ActionServices = {
      start: vi.fn(), open: vi.fn(), preview: vi.fn(), chooseRoute: vi.fn(),
      copyUrl: vi.fn(), restart: vi.fn(), stop: vi.fn(), focusTerminal: vi.fn(),
      clearTerminal: vi.fn(),
    }
    const context = { runtime: runtime(), activeRoute: "/establishments", previewOpen: false }
    const card = getRuntimeActions(context)
    const toolbar = getRuntimeActions(context)
    expect(card.map(({ id }) => id)).toEqual(toolbar.map(({ id }) => id))
    await executeRuntimeAction("runtime.open", context, services)
    expect(services.open).toHaveBeenCalledWith({ appId: "matriz-admin", routePath: "/establishments" })
  })
})
