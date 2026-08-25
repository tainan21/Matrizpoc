import { useCallback, useEffect, useState } from "react"

import type { DesktopGateway } from "../application/desktop-gateway"
import type { DesktopSettings, DesktopSnapshot } from "../domain/types"

const EMPTY_SNAPSHOT: DesktopSnapshot = { snapshotId: "loading", ports: [] }

export function useDesktop(gateway: DesktopGateway) {
  const [snapshot, setSnapshot] = useState<DesktopSnapshot>(EMPTY_SNAPSHOT)
  const [settings, setSettings] = useState<DesktopSettings>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("Pronto")

  const refresh = useCallback(async (announce = true) => {
    try {
      setSnapshot(await gateway.snapshot())
      if (announce) setMessage("Atualizado")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }, [gateway])

  const execute = useCallback(async <T,>(action: () => Promise<T>, success: string) => {
    setBusy(true)
    try {
      const result = await action()
      setMessage(success)
      return result
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
      throw error
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void refresh(false)
    void gateway.readSettings().then(setSettings).catch(() => undefined)
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(false)
    }, 5_000)
    return () => window.clearInterval(timer)
  }, [gateway, refresh])

  return { snapshot, setSnapshot, settings, setSettings, busy, message, refresh, execute }
}
