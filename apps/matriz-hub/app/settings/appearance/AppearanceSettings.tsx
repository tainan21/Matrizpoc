"use client"

import { useEffect, useState } from "react"
import { applyCapabilityTheme } from "@matriz/design-ui"
import { listCompatibleThemeOffers, type ThemeOffer } from "@matriz/flows-themes"
import styles from "./appearance.module.css"
import { operationalSoundsEnabled, setOperationalSoundsEnabled } from "../../../src/ui/feedback/operational-sounds"

interface ThemeView extends ThemeOffer { readonly unlocked: boolean }

export function AppearanceSettings() {
  const [themes, setThemes] = useState<readonly ThemeView[]>([])
  const [active, setActive] = useState("matriz-base")
  const [message, setMessage] = useState("Carregando sua aparência…")
  const [soundsEnabled, setSoundsEnabled] = useState(false)

  async function refresh() {
    const [appearanceResponse, catalogResponse] = await Promise.all([
      fetch("/api/v1/capabilities/appearance?appId=matriz-hub", { cache: "no-store" }),
      fetch("/api/v1/capabilities/themes?appId=matriz-hub", { cache: "no-store" }),
    ])
    const appearance = await appearanceResponse.json().catch(() => ({})) as { appearance?: { activeThemeKey?: string; suggestedThemeKey?: string; persistence?: string } }
    const catalog = await catalogResponse.json().catch(() => ({})) as { themes?: ThemeView[] }
    setThemes(catalog.themes ?? listCompatibleThemeOffers("matriz-hub").map((theme) => ({ ...theme, unlocked: !theme.premium })))
    setActive(appearance.appearance?.activeThemeKey ?? "matriz-base")
    setMessage(appearance.appearance?.persistence === "demo" ? "Modo demonstração: preferências duram enquanto o Hub estiver em execução." : "Preferência sincronizada.")
  }

  useEffect(() => { setSoundsEnabled(operationalSoundsEnabled()); void refresh() }, [])
  async function activate(themeKey: string) {
    const response = await fetch("/api/v1/capabilities/appearance", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ appId: "matriz-hub", themeKey }) })
    const body = await response.json().catch(() => ({})) as { appearance?: { activeThemeKey?: string }; error?: string }
    if (!response.ok) { setMessage(body.error ?? "Não foi possível aplicar este tema."); return }
    const activeThemeKey = body.appearance?.activeThemeKey ?? themeKey
    setActive(activeThemeKey)
    applyCapabilityTheme("matriz-hub", activeThemeKey)
    setMessage("Aparência aplicada neste ambiente.")
  }
  async function purchase(themeKey: string) {
    const response = await fetch("/api/v1/capabilities/themes/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ themeKey, owner: "user" }) })
    const body = await response.json().catch(() => ({})) as { error?: string }
    setMessage(response.ok ? "Checkout demonstrativo concluído. O tema foi desbloqueado." : body.error ?? "Checkout indisponível.")
    if (response.ok) await refresh()
  }
  return <main className={styles.page}>
    <header><p>AMBIENTE / APARÊNCIA</p><h1>Escolha um tema sem perder o seu contexto.</h1><span>{message}</span></header>
    <section className={styles.notice}><strong>Matriz Base</strong><span>é sempre seguro. Temas premium são uma demonstração sem cobrança real.</span></section>
    <section className={styles.notice}>
      <strong>Sons operacionais</strong>
      <span>Feedback complementar para execuções importantes. Permanece silencioso com reduced motion.</span>
      <button type="button" aria-pressed={soundsEnabled} onClick={() => { const enabled = !soundsEnabled; setOperationalSoundsEnabled(enabled); setSoundsEnabled(enabled) }}>
        {soundsEnabled ? "Desativar sons" : "Ativar sons"}
      </button>
    </section>
    <section className={styles.grid}>{themes.map((theme) => <article key={theme.key} data-active={active === theme.key}>
      <div className={styles.preview} data-theme={theme.key}><i /><b /><em /></div><small>{theme.premium ? theme.priceLabel : "Base"}</small><h2>{theme.label}</h2><p>{theme.description}</p>
      {theme.unlocked ? <button type="button" onClick={() => void activate(theme.key)}>{active === theme.key ? "Tema ativo" : "Aplicar"}</button> : <button type="button" onClick={() => void purchase(theme.key)}>Checkout demo</button>}
    </article>)}</section>
  </main>
}
