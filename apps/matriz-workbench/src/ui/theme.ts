export const THEME_COOKIE = "matriz-workbench-theme"
export type WorkbenchTheme = "light" | "dark"

export function normalizeTheme(
  value: string | undefined,
): WorkbenchTheme | undefined {
  return value === "light" || value === "dark" ? value : undefined
}
