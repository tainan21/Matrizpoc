"use client"

import { useEffect, useState } from "react"
import {
  DEFAULT_DESIGN_SYSTEM,
  THEME_COOKIE,
  normalizeDesignSystem,
  normalizeTheme,
  type WorkbenchTheme,
} from "../theme"
import { applyAppearanceToDocument } from "../theme-presets"

function preferredTheme(): WorkbenchTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function UnlockAppearanceToggle() {
  const [theme, setTheme] = useState<WorkbenchTheme>()

  useEffect(() => {
    setTheme(
      normalizeTheme(document.documentElement.dataset.theme) ?? preferredTheme(),
    )
  }, [])

  function toggleTheme() {
    const current = theme ?? preferredTheme()
    const next = current === "dark" ? "light" : "dark"
    const system =
      normalizeDesignSystem(document.documentElement.dataset.system) ??
      DEFAULT_DESIGN_SYSTEM

    applyAppearanceToDocument(next, system)
    document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Strict`
    setTheme(next)
  }

  const isDark = theme === "dark"

  return (
    <button
      aria-label={`Ativar tema ${isDark ? "claro" : "escuro"}`}
      className="unlock-theme-toggle"
      onClick={toggleTheme}
      type="button"
    >
      <span className="unlock-theme-icon" aria-hidden="true">
        {isDark ? (
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24">
            <path d="M20.4 15.2A8.5 8.5 0 0 1 8.8 3.6 8.5 8.5 0 1 0 20.4 15.2Z" />
          </svg>
        )}
      </span>
      <span>{isDark ? "Claro" : "Escuro"}</span>
    </button>
  )
}
