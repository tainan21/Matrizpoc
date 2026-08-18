"use client"

import type { CSSProperties, ChangeEvent } from "react"
import { useState } from "react"
import {
  themeDefinitionToCssVars,
  listCompatibleThemes,
  type MatrizColorMode,
  type ThemeKey,
} from "@matriz/design-system"
import { Label } from "@matriz/design-ui"

import {
  ThemeSpecimen,
  type ThemeLabDensity,
  type ThemeLabViewport,
} from "./theme-specimen"

const LAB_APP_ID = "matrizlib" as const

const densityOptions: readonly { readonly label: string; readonly value: ThemeLabDensity }[] = [
  { label: "Confortável", value: "comfortable" },
  { label: "Compacta", value: "compact" },
]

const viewportOptions: readonly { readonly label: string; readonly value: ThemeLabViewport }[] = [
  { label: "Desktop · 1280", value: "desktop" },
  { label: "Tablet · 768", value: "tablet" },
  { label: "Mobile · 390", value: "mobile" },
]

const compatibleThemes = listCompatibleThemes(LAB_APP_ID)

type CssVariableStyle = CSSProperties & Record<`--${string}`, string>

function selectValue<T extends string>(event: ChangeEvent<HTMLSelectElement>): T {
  return event.target.value as T
}

export function ThemeLab() {
  const [themeKey, setThemeKey] = useState<ThemeKey>("matriz-base")
  const [mode, setMode] = useState<MatrizColorMode>("light")
  const [density, setDensity] = useState<ThemeLabDensity>("comfortable")
  const [viewport, setViewport] = useState<ThemeLabViewport>("desktop")

  const selectedTheme = compatibleThemes.find((theme) => theme.key === themeKey) ?? compatibleThemes[0]
  const specimenStyle = themeDefinitionToCssVars(themeKey, LAB_APP_ID, mode) as CssVariableStyle

  return (
    <section aria-labelledby="theme-lab-title" className="theme-lab">
      <div className="theme-lab__controls">
        <div className="theme-lab__control">
          <Label htmlFor="theme-lab-theme">Tema</Label>
          <select
            id="theme-lab-theme"
            onChange={(event) => setThemeKey(selectValue<ThemeKey>(event))}
            value={themeKey}
          >
            {compatibleThemes.map((theme) => (
              <option key={theme.key} value={theme.key}>
                {theme.label}
              </option>
            ))}
          </select>
        </div>

        <div className="theme-lab__control">
          <Label htmlFor="theme-lab-mode">Modo</Label>
          <select
            id="theme-lab-mode"
            onChange={(event) => setMode(selectValue<MatrizColorMode>(event))}
            value={mode}
          >
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </div>

        <div className="theme-lab__control">
          <Label htmlFor="theme-lab-density">Densidade</Label>
          <select
            id="theme-lab-density"
            onChange={(event) => setDensity(selectValue<ThemeLabDensity>(event))}
            value={density}
          >
            {densityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="theme-lab__control">
          <Label htmlFor="theme-lab-viewport">Viewport</Label>
          <select
            id="theme-lab-viewport"
            onChange={(event) => setViewport(selectValue<ThemeLabViewport>(event))}
            value={viewport}
          >
            {viewportOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="theme-lab__context">
        <p id="theme-lab-title">
          <strong>{selectedTheme.label}</strong>
          <span>{selectedTheme.description}</span>
        </p>
        <code>{selectedTheme.key}@{selectedTheme.version}</code>
      </div>

      <ThemeSpecimen
        density={density}
        mode={mode}
        style={specimenStyle}
        themeLabel={selectedTheme.label}
        viewport={viewport}
      />

      <p className="theme-lab__boundary">
        O laboratório usa a superfície do próprio MatrizLib e oferece somente definições que o
        registry declara compatíveis. A seleção vive neste componente e não grava entitlement,
        preferência do Hub ou CSS arbitrário.
      </p>
    </section>
  )
}
