export const CONTROL_THEME_STORAGE_KEY = "matriz-control:theme:v1"

export const CONTROL_THEMES = [
  { id: "matriz", label: "Matriz", description: "Roxo operacional, o tema padrão." },
  { id: "reactor-acid", label: "Reator Ácido", description: "Preto, verde elétrico e âmbar." },
  { id: "aurora-liquid", label: "Aurora Líquida", description: "Azul-ciano e magenta em contraste." },
  { id: "industrial-ember", label: "Brasa Industrial", description: "Grafite, laranja e vermelho." },
] as const

export type ControlTheme = (typeof CONTROL_THEMES)[number]["id"]
export type ControlThemeStorage = Pick<Storage, "getItem" | "setItem">

export function parseControlTheme(value: string | null | undefined): ControlTheme {
  if (!value) return "matriz"
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed === "object" && parsed !== null && "theme" in parsed && "version" in parsed) {
      const { theme, version } = parsed as { theme?: unknown; version?: unknown }
      if (version === 1 && typeof theme === "string" && CONTROL_THEMES.some((item) => item.id === theme)) return theme as ControlTheme
    }
  } catch { /* Malformed local preference falls back to the safe default. */ }
  return "matriz"
}

export function serializeControlTheme(theme: ControlTheme): string { return JSON.stringify({ version: 1, theme }) }
export function readStoredControlTheme(storage: Pick<ControlThemeStorage, "getItem">): ControlTheme {
  try { return parseControlTheme(storage.getItem(CONTROL_THEME_STORAGE_KEY)) } catch { return "matriz" }
}
export function storeControlTheme(storage: Pick<ControlThemeStorage, "setItem">, theme: ControlTheme): void { storage.setItem(CONTROL_THEME_STORAGE_KEY, serializeControlTheme(theme)) }
