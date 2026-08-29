"use client"

import { CONTROL_THEMES } from "./control-theme"
import { useControlTheme } from "./theme-provider"

export function ThemePicker() {
  const { theme, setTheme } = useControlTheme()
  return <section className="theme-picker" aria-labelledby="theme-heading"><div><span className="section-label">APARÊNCIA / LOCAL</span><h2 id="theme-heading">Tema do cockpit</h2><p>A preferência fica somente neste navegador e é aplicada imediatamente.</p></div><div className="theme-options">{CONTROL_THEMES.map((item) => <button type="button" className={theme === item.id ? "selected" : ""} key={item.id} onClick={() => setTheme(item.id)} aria-pressed={theme === item.id}><i data-theme-swatch={item.id} /><span><b>{item.label}</b><small>{item.description}</small></span></button>)}</div></section>
}
