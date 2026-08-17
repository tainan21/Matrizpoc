"use client"

import { useEffect, useState } from "react"
import {
  getAppTheme,
  themeDefinitionToCssVars,
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

interface RemoteAppearanceResponse {
  readonly appearance?: { readonly activeThemeKey?: string; readonly suggestedThemeKey?: string }
}

export function applyCapabilityTheme(appId: MatrizAppId, themeKey: string): void {
  const root = document.documentElement
  const mode: MatrizColorMode = root.dataset.theme === "light" ? "light" : "dark"
  root.dataset.matrizTheme = themeKey
  for (const [name, value] of Object.entries(themeDefinitionToCssVars(themeKey, appId, mode))) root.style.setProperty(name, value)
}

/**
 * Optional cross-app layer. The owning app remains usable with its local
 * palette when the Hub is not running or a user has not authenticated.
 */
export function CapabilityThemeController({ appId, hubBaseUrl }: { appId: MatrizAppId; hubBaseUrl: string }) {
  useEffect(() => {
    let active = true
    void fetch(`${hubBaseUrl}/api/v1/capabilities/appearance?appId=${appId}`, { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<RemoteAppearanceResponse> : undefined)
      .then((payload) => {
        const themeKey = payload?.appearance?.activeThemeKey
        if (active && themeKey) applyCapabilityTheme(appId, themeKey)
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [appId, hubBaseUrl])
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
    const capabilityTheme = document.documentElement.dataset.matrizTheme
    if (capabilityTheme && capabilityTheme !== "matriz-base") {
      applyCapabilityTheme(appId, capabilityTheme)
    }
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
