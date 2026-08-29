"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { readStoredControlTheme, storeControlTheme, type ControlTheme } from "./control-theme"

type ThemeContextValue = { theme: ControlTheme; setTheme(theme: ControlTheme): void }
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ControlTheme>("matriz")
  useEffect(() => { setThemeState(readStoredControlTheme(window.localStorage)) }, [])
  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme(next) {
      setThemeState(next)
      try { storeControlTheme(window.localStorage, next) } catch { /* Preferences remain optional. */ }
    },
  }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useControlTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useControlTheme must be used inside ThemeProvider")
  return context
}
