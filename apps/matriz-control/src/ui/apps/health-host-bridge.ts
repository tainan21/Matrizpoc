"use client"

import { useEffect, type RefObject } from "react"
import { CONTROL_HOST_HEALTH_MESSAGE, controlHostHealthSchema } from "@matriz/integration-api-contracts"
import type { DesktopCommand } from "../../application/desktop-bridge"

const SAMPLE_INTERVAL_MS = 1_000

interface MessageTarget {
  postMessage(message: unknown, targetOrigin: string): void
}

export interface HealthHostBridgeDependencies {
  readonly invoke: (command: DesktopCommand) => Promise<unknown>
  readonly targetWindow: MessageTarget
  readonly targetOrigin: string
  readonly isVisible: () => boolean
  readonly subscribeToVisibility: (listener: () => void) => () => void
}

export function createHealthHostBridge(deps: HealthHostBridgeDependencies) {
  let active = false
  let inFlight = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let unsubscribe: (() => void) | undefined

  const clearScheduledSample = () => {
    if (timer === undefined) return
    clearTimeout(timer)
    timer = undefined
  }

  const schedule = (delayMs: number) => {
    clearScheduledSample()
    if (!active || !deps.isVisible()) return
    timer = setTimeout(() => {
      timer = undefined
      void sample()
    }, delayMs)
  }

  const sample = async () => {
    if (!active || !deps.isVisible() || inFlight) return
    inFlight = true
    try {
      const result = controlHostHealthSchema.safeParse(await deps.invoke({ type: "health.host-snapshot" }))
      if (result.success && active && deps.isVisible()) {
        deps.targetWindow.postMessage({ type: CONTROL_HOST_HEALTH_MESSAGE, payload: result.data }, deps.targetOrigin)
      }
    } catch {
      // A missing desktop bridge is an unavailable host metric, not an app error.
    } finally {
      inFlight = false
      schedule(SAMPLE_INTERVAL_MS)
    }
  }

  const onVisibilityChange = () => {
    if (!deps.isVisible()) {
      clearScheduledSample()
      return
    }
    schedule(0)
  }

  return {
    start() {
      if (active) return
      active = true
      unsubscribe = deps.subscribeToVisibility(onVisibilityChange)
      schedule(0)
    },
    stop() {
      active = false
      clearScheduledSample()
      unsubscribe?.()
      unsubscribe = undefined
    },
  }
}

export function HealthHostBridge({ baseUrl, frameRef }: { readonly baseUrl: string; readonly frameRef: RefObject<HTMLIFrameElement | null> }) {
  useEffect(() => {
    const desktop = window.matrizDesktop
    const targetWindow = frameRef.current?.contentWindow
    if (!desktop || !targetWindow) return
    const bridge = createHealthHostBridge({
      invoke: desktop.invoke,
      targetWindow,
      targetOrigin: new URL(baseUrl).origin,
      isVisible: () => document.visibilityState === "visible",
      subscribeToVisibility: (listener) => {
        document.addEventListener("visibilitychange", listener)
        return () => document.removeEventListener("visibilitychange", listener)
      },
    })
    bridge.start()
    return () => bridge.stop()
  }, [baseUrl, frameRef])

  return null
}
