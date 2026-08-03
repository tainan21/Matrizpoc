"use client"

import { useEffect, useState } from "react"
import {
  getAppTheme,
  themeToCssVars,
  type MatrizColorMode,
} from "@matriz/design-system"
import type { MatrizAppId } from "@matriz/foundation-constants"

const STORAGE_KEY = "matriz-color-mode"

function preferredMode(): MatrizColorMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function storedMode(): MatrizColorMode | undefined {
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value === "light" || value === "dark" ? value : undefined
}

function applyMode(appId: MatrizAppId, mode: MatrizColorMode): void {
  const root = document.documentElement
  root.dataset.theme = mode
  root.style.colorScheme = mode
  for (const [name, value] of Object.entries(
    themeToCssVars(getAppTheme(appId, mode)),
  )) {
    root.style.setProperty(name, value)
  }
}

export function ThemeController({ appId }: { appId: MatrizAppId }) {
  useEffect(() => {
    applyMode(appId, storedMode() ?? preferredMode())
  }, [appId])

  return null
}

export function ThemeToggle({
  appId,
  className,
}: {
  appId: MatrizAppId
  className?: string
}) {
  const [mode, setMode] = useState<MatrizColorMode>()

  useEffect(() => {
    const next = storedMode() ?? preferredMode()
    applyMode(appId, next)
    setMode(next)
  }, [appId])

  function toggle() {
    const next = (mode ?? preferredMode()) === "dark" ? "light" : "dark"
    window.localStorage.setItem(STORAGE_KEY, next)
    applyMode(appId, next)
    setMode(next)
  }

  const nextLabel = mode === "dark" ? "claro" : "escuro"

  return (
    <button
      aria-label={`Ativar tema ${nextLabel}`}
      className={["matriz-theme-toggle", className].filter(Boolean).join(" ")}
      onClick={toggle}
      type="button"
    >
      <span aria-hidden="true" className="matriz-theme-toggle-icon">
        {mode === "dark" ? "☀" : "◐"}
      </span>
      <span>{mode === "dark" ? "Claro" : "Escuro"}</span>
    </button>
  )
}
