export const THEME_COOKIE = "matriz-workbench-theme"
export const THEME_SYSTEM_COOKIE = "matriz-workbench-system"

export type WorkbenchColorMode = "light" | "dark"
export type WorkbenchTheme = WorkbenchColorMode
export type WorkbenchDesignSystemId =
  | "default"
  | "neo-brutal"
  | "midnight-graphite"
  | "pearl-light"
  | "aurora"
  | "zen"
  | "pulse"
  | "terra"
  | "dracula"
  | "glass"

export interface WorkbenchAppearance {
  mode: WorkbenchColorMode
  system: WorkbenchDesignSystemId
}

export const DEFAULT_DESIGN_SYSTEM: WorkbenchDesignSystemId = "midnight-graphite"

export const WORKBENCH_DESIGN_SYSTEM_IDS = [
  "default",
  "neo-brutal",
  "midnight-graphite",
  "pearl-light",
  "aurora",
  "zen",
  "pulse",
  "terra",
  "dracula",
  "glass",
] as const satisfies readonly WorkbenchDesignSystemId[]

export function normalizeTheme(
  value: string | undefined,
): WorkbenchTheme | undefined {
  return value === "light" || value === "dark" ? value : undefined
}

export function normalizeDesignSystem(
  value: string | undefined,
): WorkbenchDesignSystemId | undefined {
  return WORKBENCH_DESIGN_SYSTEM_IDS.find((system) => system === value)
}

export function normalizeAppearance(
  mode: string | undefined,
  system: string | undefined,
): WorkbenchAppearance {
  return {
    mode: normalizeTheme(mode) ?? "dark",
    system: normalizeDesignSystem(system) ?? DEFAULT_DESIGN_SYSTEM,
  }
}
