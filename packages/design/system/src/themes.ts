import type { MatrizAppId } from "@matriz/foundation-constants"
import { semanticFeedbackColors, type SemanticTokenName } from "./tokens"

export type MatrizColorMode = "light" | "dark"

export interface AppThemeTokens {
  readonly appId: MatrizAppId
  readonly label: string
  readonly brandAccent: string
  readonly brandAccentFg: string
  readonly surface: string
  readonly surfaceFg: string
  readonly muted: string
  readonly mutedFg: string
  readonly border: string
}

export const appThemes: Readonly<Record<MatrizAppId, AppThemeTokens>> = {
  "matriz-hub": {
    appId: "matriz-hub", label: "Matriz Hub", brandAccent: "#0f172a", brandAccentFg: "#f8fafc",
    surface: "#ffffff", surfaceFg: "#0f172a", muted: "#f1f5f9", mutedFg: "#475569", border: "#e2e8f0",
  },
  "matriz-desktop": {
    appId: "matriz-desktop", label: "Matriz Control", brandAccent: "#7c3aed", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#17131d", muted: "#f5f3f8", mutedFg: "#61586d", border: "#e1d9e8",
  },
  matrizlib: {
    appId: "matrizlib", label: "MatrizLib", brandAccent: "#7c3aed", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#17171c", muted: "#f5f3ff", mutedFg: "#5b5870", border: "#ddd6fe",
  },
  "matriz-workbench": {
    appId: "matriz-workbench", label: "Matriz Workbench", brandAccent: "#5b5bd6", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#17171c", muted: "#f5f5f7", mutedFg: "#666671", border: "#dfdfe5",
  },
  sites: {
    appId: "sites", label: "Matriz Sites", brandAccent: "#4d7c0f", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#151a12", muted: "#f3f6ed", mutedFg: "#626b5b", border: "#dfe5d7",
  },
  spot: {
    appId: "spot", label: "Spot", brandAccent: "#f59e0b", brandAccentFg: "#0f172a",
    surface: "#ffffff", surfaceFg: "#1c1917", muted: "#fef3c7", mutedFg: "#78350f", border: "#fde68a",
  },
  "matriz-admin": {
    appId: "matriz-admin", label: "Matriz Admin", brandAccent: "#6d4aff", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#17131d", muted: "#f4f1fb", mutedFg: "#625a70", border: "#ddd5e8",
  },
  seumei: {
    appId: "seumei", label: "Seu Mei", brandAccent: "#059669", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#052e16", muted: "#ecfdf5", mutedFg: "#065f46", border: "#a7f3d0",
  },
  contracts: {
    appId: "contracts", label: "Contracts", brandAccent: "#2563eb", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#0f172a", muted: "#eff6ff", mutedFg: "#1e3a8a", border: "#bfdbfe",
  },
  willdash: {
    appId: "willdash", label: "WillDash", brandAccent: "#db2777", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#1f2937", muted: "#fdf2f8", mutedFg: "#831843", border: "#fbcfe8",
  },
}

export const darkAppThemes: Readonly<Record<MatrizAppId, AppThemeTokens>> = {
  "matriz-hub": {
    appId: "matriz-hub", label: "Matriz Hub", brandAccent: "#9b8cff", brandAccentFg: "#0b0818",
    surface: "#0b111b", surfaceFg: "#f4f6fb", muted: "#101824", mutedFg: "#aeb7c7", border: "#283246",
  },
  "matriz-desktop": {
    appId: "matriz-desktop", label: "Matriz Control", brandAccent: "#9a66ff", brandAccentFg: "#0b0712",
    surface: "#0f0c16", surfaceFg: "#f5f1fb", muted: "#08070d", mutedFg: "#8e879d", border: "#332741",
  },
  matrizlib: {
    appId: "matrizlib", label: "MatrizLib", brandAccent: "#a78bfa", brandAccentFg: "#160b2e",
    surface: "#100d18", surfaceFg: "#f7f5ff", muted: "#1a1429", mutedFg: "#c4bdd7", border: "#352650",
  },
  "matriz-workbench": {
    appId: "matriz-workbench", label: "Matriz Workbench", brandAccent: "#9b8cff", brandAccentFg: "#0b0818",
    surface: "#0b111b", surfaceFg: "#f4f6fb", muted: "#101824", mutedFg: "#aeb7c7", border: "#283246",
  },
  sites: {
    appId: "sites", label: "Matriz Sites", brandAccent: "#c8ff66", brandAccentFg: "#10131a",
    surface: "#171b24", surfaceFg: "#f5f7ef", muted: "#10131a", mutedFg: "#9da49a", border: "#30362f",
  },
  spot: {
    appId: "spot", label: "Spot", brandAccent: "#f6b83f", brandAccentFg: "#17110a",
    surface: "#12100c", surfaceFg: "#fff7e8", muted: "#1d1810", mutedFg: "#cbbd9f", border: "#3d3220",
  },
  "matriz-admin": {
    appId: "matriz-admin", label: "Matriz Admin", brandAccent: "#a98cff", brandAccentFg: "#0b0712",
    surface: "#0f0c16", surfaceFg: "#f5f1fb", muted: "#18121f", mutedFg: "#aaa0b7", border: "#362a42",
  },
  seumei: {
    appId: "seumei", label: "Seu Mei", brandAccent: "#43d39e", brandAccentFg: "#04130d",
    surface: "#071511", surfaceFg: "#effcf6", muted: "#0d211a", mutedFg: "#a5c7b8", border: "#244639",
  },
  contracts: {
    appId: "contracts", label: "Contracts", brandAccent: "#79a8ff", brandAccentFg: "#07111f",
    surface: "#0a111d", surfaceFg: "#f1f5fb", muted: "#111c2b", mutedFg: "#aeb9c9", border: "#2b3a50",
  },
  willdash: {
    appId: "willdash", label: "WillDash", brandAccent: "#ff72b4", brandAccentFg: "#1d0812",
    surface: "#160b14", surfaceFg: "#fff3f9", muted: "#21101e", mutedFg: "#caa9ba", border: "#47243b",
  },
}

export const getAppTheme = (
  appId: MatrizAppId,
  mode: MatrizColorMode = "light",
): AppThemeTokens => mode === "dark" ? darkAppThemes[appId] : appThemes[appId]

export function themeToCssVars(
  theme: AppThemeTokens,
  mode: MatrizColorMode = darkAppThemes[theme.appId].surface === theme.surface ? "dark" : "light",
): Record<SemanticTokenName | string, string> {
  const feedback = semanticFeedbackColors[mode]
  const semantic = {
    "--matriz-color-canvas": theme.muted,
    "--matriz-color-surface": theme.surface,
    "--matriz-color-text": theme.surfaceFg,
    "--matriz-color-text-muted": theme.mutedFg,
    "--matriz-color-border": theme.border,
    "--matriz-color-action": theme.brandAccent,
    "--matriz-color-action-text": theme.brandAccentFg,
    "--matriz-color-focus": theme.brandAccent,
    "--matriz-color-success": feedback.success,
    "--matriz-color-warning": feedback.warning,
    "--matriz-color-danger": feedback.danger,
    "--matriz-color-info": feedback.info,
  } satisfies Record<SemanticTokenName, string>

  return {
    ...semantic,
    "--brand": semantic["--matriz-color-action"],
    "--brand-fg": semantic["--matriz-color-action-text"],
    "--surface": semantic["--matriz-color-surface"],
    "--surface-fg": semantic["--matriz-color-text"],
    "--muted": theme.muted,
    "--muted-fg": semantic["--matriz-color-text-muted"],
    "--border": semantic["--matriz-color-border"],
    "--color-background": semantic["--matriz-color-canvas"],
    "--color-foreground": semantic["--matriz-color-text"],
    "--color-surface": semantic["--matriz-color-surface"],
    "--color-surface-foreground": semantic["--matriz-color-text"],
    "--color-muted": theme.muted,
    "--color-muted-foreground": semantic["--matriz-color-text-muted"],
    "--color-border": semantic["--matriz-color-border"],
    "--color-primary": semantic["--matriz-color-action"],
    "--color-primary-foreground": semantic["--matriz-color-action-text"],
    "--canvas": semantic["--matriz-color-canvas"],
    "--canvas-fg": semantic["--matriz-color-text"],
    "--surface-2": theme.muted,
    "--text": semantic["--matriz-color-text"],
    "--text-muted": semantic["--matriz-color-text-muted"],
    "--accent": semantic["--matriz-color-action"],
    "--accent-fg": semantic["--matriz-color-action-text"],
    "--accent-soft": theme.muted,
    "--line": semantic["--matriz-color-border"],
    "--danger": semantic["--matriz-color-danger"],
    "--danger-soft": `color-mix(in srgb, ${semantic["--matriz-color-danger"]} 12%, transparent)`,
    "--success": semantic["--matriz-color-success"],
    "--success-soft": `color-mix(in srgb, ${semantic["--matriz-color-success"]} 12%, transparent)`,
    "--warning": semantic["--matriz-color-warning"],
    "--warning-soft": `color-mix(in srgb, ${semantic["--matriz-color-warning"]} 13%, transparent)`,
    "--info": semantic["--matriz-color-info"],
    "--info-soft": `color-mix(in srgb, ${semantic["--matriz-color-info"]} 12%, transparent)`,
  }
}

export interface ThemeDefinition {
  readonly key: string
  readonly version: number
  readonly label: string
  readonly description: string
  readonly compatibleApps: readonly MatrizAppId[]
  readonly overrides?: Readonly<Partial<Pick<AppThemeTokens, "brandAccent" | "brandAccentFg" | "surface" | "surfaceFg" | "muted" | "mutedFg" | "border">>>
}

const ALL_MATRIZ_APPS: readonly MatrizAppId[] = [
  "matriz-hub", "matriz-desktop", "matrizlib", "matriz-workbench", "sites", "spot", "matriz-admin", "seumei", "contracts", "willdash",
]

export const themeRegistry = [
  {
    key: "matriz-base", version: 1, label: "Matriz Base",
    description: "A base semântica que preserva a identidade de cada produto.", compatibleApps: ALL_MATRIZ_APPS,
  },
  {
    key: "midnight-graphite", version: 1, label: "Midnight Graphite",
    description: "Grafite profundo, violeta frio e contraste editorial.", compatibleApps: ["matriz-hub", "matriz-desktop", "matriz-workbench", "sites"],
    overrides: { brandAccent: "#8b5cf6", brandAccentFg: "#070b13", surface: "#0b111b", surfaceFg: "#f4f6fb", muted: "#101824", mutedFg: "#aeb7c7", border: "#283246" },
  },
  {
    key: "aurora", version: 1, label: "Aurora",
    description: "Ciano e teal para superfícies de operação concentrada.", compatibleApps: ["matriz-hub", "matriz-workbench", "seumei", "contracts"],
    overrides: { brandAccent: "#08b8d6", brandAccentFg: "#031019", surface: "#071a25", surfaceFg: "#edfaff", muted: "#0b2430", mutedFg: "#b2d1db", border: "#153747" },
  },
  {
    key: "terra", version: 1, label: "Terra",
    description: "Âmbar, oliva e superfícies quentes para fluxos calmos.", compatibleApps: ["matriz-workbench", "spot", "willdash"],
    overrides: { brandAccent: "#d59a3a", brandAccentFg: "#100e0a", surface: "#19160f", surfaceFg: "#f9f4e7", muted: "#221e15", mutedFg: "#d0c6ad", border: "#393222" },
  },
] as const satisfies readonly ThemeDefinition[]

export type ThemeKey = (typeof themeRegistry)[number]["key"]

export function getThemeDefinition(key: string): ThemeDefinition | undefined {
  return themeRegistry.find((theme) => theme.key === key)
}

export function listCompatibleThemes(appId: MatrizAppId): readonly ThemeDefinition[] {
  return themeRegistry.filter((theme) => (theme.compatibleApps as readonly MatrizAppId[]).includes(appId))
}

export function themeDefinitionToCssVars(
  themeKey: string,
  appId: MatrizAppId,
  mode: MatrizColorMode = appId === "matriz-hub" || appId === "matriz-desktop" || appId === "matriz-workbench" ? "dark" : "light",
): Record<string, string> {
  const definition = getThemeDefinition(themeKey)
  const compatible = definition?.compatibleApps.includes(appId) ?? false
  const baseTheme = getAppTheme(appId, mode)
  const theme = compatible && definition ? { ...baseTheme, ...definition.overrides } : baseTheme

  return {
    ...themeToCssVars(theme, mode),
    "--matriz-theme-key": compatible ? themeKey : "matriz-base",
    "--matriz-theme-surface": theme.surface,
    "--matriz-theme-surface-fg": theme.surfaceFg,
    "--matriz-theme-muted": theme.muted,
    "--matriz-theme-muted-fg": theme.mutedFg,
    "--matriz-theme-border": theme.border,
    "--matriz-theme-accent": theme.brandAccent,
    "--matriz-theme-accent-fg": theme.brandAccentFg,
  }
}
