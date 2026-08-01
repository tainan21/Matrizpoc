"use client"

import { useEffect, useState } from "react"
import {
  THEME_COOKIE,
  normalizeTheme,
  type WorkbenchTheme,
} from "../theme"

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
    document.documentElement.dataset.theme = next
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
