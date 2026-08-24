"use client"

import { useEffect, useState } from "react"
import { matrizTokenContract, matrizTokenMetadata } from "@matriz/design-system"
import {
  DEFAULT_DESIGN_SYSTEM,
  normalizeDesignSystem,
  normalizeTheme,
  THEME_SYSTEM_COOKIE,
  type WorkbenchColorMode,
  type WorkbenchDesignSystemId,
} from "../theme"
import { applyAppearanceToDocument, getThemePreset, WORKBENCH_THEME_PRESETS } from "../theme-presets"
import styles from "./theme-system-picker.module.css"

const MATRIZLIB_TOKEN_ALIASES = [
  ["--matriz-color-canvas", "--wb-canvas"],
  ["--matriz-color-surface", "--wb-surface-1"],
  ["--matriz-color-action", "--wb-accent"],
  ["--matriz-color-focus", "--wb-focus"],
] as const

const MATRIZLIB_SEMANTIC_TOKEN_COUNT = matrizTokenMetadata.filter(
  (token) => token.layer === "semantic",
).length

function currentAppearance(): { mode: WorkbenchColorMode; system: WorkbenchDesignSystemId } {
  return {
    mode: normalizeTheme(document.documentElement.dataset.theme) ?? "dark",
    system: normalizeDesignSystem(document.documentElement.dataset.system) ?? DEFAULT_DESIGN_SYSTEM,
  }
}

export function ThemeSystemPicker({ variant = "compact" }: { variant?: "compact" | "gallery" }) {
  const [mode, setMode] = useState<WorkbenchColorMode>("dark")
  const [system, setSystem] = useState<WorkbenchDesignSystemId>(DEFAULT_DESIGN_SYSTEM)

  useEffect(() => {
    const appearance = currentAppearance()
    setMode(appearance.mode)
    setSystem(appearance.system)
  }, [])

  function choose(next: WorkbenchDesignSystemId) {
    const appearance = currentAppearance()
    document.documentElement.dataset.system = next
    if (appearance.mode === "dark") applyAppearanceToDocument("dark", next)
    document.cookie = `${THEME_SYSTEM_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Strict`
    setMode(appearance.mode)
    setSystem(next)
  }

  if (variant === "compact") {
    const preset = getThemePreset(system)
    const modeLabel = mode === "dark" ? "escuro" : "claro"
    return (
      <label className={styles.compact} title={mode === "light" ? "Sistema salvo para o modo escuro" : "Sistema visual ativo"}>
        <i aria-hidden="true" style={{ background: preset.tokens.accent }} />
        <strong aria-hidden="true">{preset.shortLabel}</strong>
        <select aria-label={`Aparência: ${modeLabel}, ${preset.label}`} onChange={(event) => choose(event.target.value as WorkbenchDesignSystemId)} value={system}>
          {WORKBENCH_THEME_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
        </select>
      </label>
    )
  }

  return (
    <section className={styles.gallery} aria-labelledby="appearance-heading">
      <header>
        <div><p className="eyebrow">Experimento app-local</p><h2 id="appearance-heading">Sistema visual</h2></div>
        <span>{mode === "light" ? "Escolha salva para o modo escuro" : "Aplicado imediatamente"}</span>
      </header>
      <div className={styles.compatibility} aria-label="Compatibilidade MatrizLib">
        <i aria-hidden="true" />
        <div>
          <strong>MatrizLib compativel</strong>
          <small>Contrato publico v{matrizTokenContract.version} com {MATRIZLIB_SEMANTIC_TOKEN_COUNT} tokens semanticos.</small>
        </div>
        <p>
          Aliases locais: {MATRIZLIB_TOKEN_ALIASES.map(([publicToken, localToken]) => (
            <code key={publicToken}>{publicToken} to {localToken}</code>
          ))}
        </p>
      </div>
      <div className={styles.grid}>
        {WORKBENCH_THEME_PRESETS.map((preset) => (
          <button aria-pressed={system === preset.id} className={system === preset.id ? styles.selected : undefined} key={preset.id} onClick={() => choose(preset.id)} type="button">
            <span className={styles.preview} style={{ background: preset.tokens.canvas, borderColor: preset.tokens.borderStrong }}>
              <i style={{ background: preset.tokens.surface2 }} /><b style={{ background: preset.tokens.accent }} /><em style={{ background: preset.tokens.surface3 }} />
            </span>
            <strong>{preset.label}</strong>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>
      <p className={styles.note}>Preferência local deste navegador. Os presets são temporários e não sincronizam dados do projeto.</p>
    </section>
  )
}
