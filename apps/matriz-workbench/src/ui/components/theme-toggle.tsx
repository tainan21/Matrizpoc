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

function systemTheme(): WorkbenchTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<WorkbenchTheme>()

  useEffect(() => {
    setTheme(
      normalizeTheme(document.documentElement.dataset.theme) ?? systemTheme(),
    )
  }, [])

  function toggleTheme() {
    const next = (theme ?? systemTheme()) === "dark" ? "light" : "dark"
    const system = normalizeDesignSystem(document.documentElement.dataset.system) ?? DEFAULT_DESIGN_SYSTEM
    applyAppearanceToDocument(next, system)
    document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Strict`
    setTheme(next)
  }

  const nextLabel = theme === "dark" ? "claro" : "escuro"
  return (
    <button
      aria-label={`Ativar tema ${nextLabel}`}
      className="theme-toggle"
      onClick={toggleTheme}
      type="button"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</span>
      <span className="sr-only">Tema {theme ?? "do sistema"}</span>
    </button>
  )
}
