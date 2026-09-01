import { operationalThemes, type OperationalThemeId } from "@matriz/design-system"

const THEME_CACHE_KEY = "matriz-control:theme:v1"
const themeIds = new Set<OperationalThemeId>(operationalThemes.map(({ id }) => id))

export function readCachedTheme(storage: Pick<Storage, "getItem"> = localStorage): OperationalThemeId {
  try {
    const value = storage.getItem(THEME_CACHE_KEY)
    if (!value) return "matriz"
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== "object" || parsed === null) return "matriz"
    const { version, theme } = parsed as { version?: unknown; theme?: unknown }
    return version === 1 && typeof theme === "string" && themeIds.has(theme as OperationalThemeId)
      ? theme as OperationalThemeId
      : "matriz"
  } catch {
    return "matriz"
  }
}

export function applyControlTheme(theme: OperationalThemeId, storage: Pick<Storage, "setItem"> = localStorage): void {
  document.documentElement.dataset.matrizlib = "0.1.0"
  document.documentElement.dataset.theme = theme
  try {
    storage.setItem(THEME_CACHE_KEY, JSON.stringify({ version: 1, theme }))
  } catch {
    // The atomic native settings remain authoritative when browser storage is unavailable.
  }
}
