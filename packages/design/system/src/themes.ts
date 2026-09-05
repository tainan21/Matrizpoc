import type { MatrizAppId } from "@matriz/foundation-constants"
import { semanticFeedbackColors, type SemanticTokenName } from "./tokens"

export interface OperationalTheme {
  readonly id: "matriz" | "reactor-acid" | "aurora-liquid" | "industrial-ember" | "dracula-dark" | "terminal-green" | "quiet-depth" | "soft-graphite"
  readonly label: string
  readonly description: string
  readonly tokens: Readonly<Record<SemanticTokenName, string>>
}

export const operationalThemes = [
  {
    id: "matriz", label: "Matriz", description: "Roxo operacional, o tema padrão.",
    tokens: {
      "--matriz-color-canvas": "#08060e", "--matriz-color-surface": "#0d0915", "--matriz-color-text": "#f4effb", "--matriz-color-text-muted": "#82778f", "--matriz-color-border": "#2a1c3d", "--matriz-color-action": "#9a55ff", "--matriz-color-action-text": "#08060e", "--matriz-color-focus": "#b98aff", "--matriz-color-success": "#51e2a8", "--matriz-color-warning": "#efb563", "--matriz-color-danger": "#ed6b7a", "--matriz-color-info": "#b98aff",
    },
  },
  {
    id: "reactor-acid", label: "Reator Ácido", description: "Preto, verde elétrico e âmbar.",
    tokens: {
      "--matriz-color-canvas": "#050806", "--matriz-color-surface": "#0b120c", "--matriz-color-text": "#efffe8", "--matriz-color-text-muted": "#99a993", "--matriz-color-border": "#2d4c29", "--matriz-color-action": "#b7ff21", "--matriz-color-action-text": "#050806", "--matriz-color-focus": "#b7ff21", "--matriz-color-success": "#b7ff21", "--matriz-color-warning": "#ffb02e", "--matriz-color-danger": "#ff7768", "--matriz-color-info": "#9ee7ff",
    },
  },
  {
    id: "aurora-liquid", label: "Aurora Líquida", description: "Azul-ciano e magenta em contraste.",
    tokens: {
      "--matriz-color-canvas": "#070819", "--matriz-color-surface": "#0b0c21", "--matriz-color-text": "#f7f5ff", "--matriz-color-text-muted": "#a19bbd", "--matriz-color-border": "#2d2c61", "--matriz-color-action": "#e34eff", "--matriz-color-action-text": "#070819", "--matriz-color-focus": "#42e8ff", "--matriz-color-success": "#42e8ff", "--matriz-color-warning": "#ffc862", "--matriz-color-danger": "#ff719e", "--matriz-color-info": "#42e8ff",
    },
  },
  {
    id: "industrial-ember", label: "Brasa Industrial", description: "Grafite, laranja e vermelho.",
    tokens: {
      "--matriz-color-canvas": "#0d0c0b", "--matriz-color-surface": "#151211", "--matriz-color-text": "#fff4eb", "--matriz-color-text-muted": "#b3a096", "--matriz-color-border": "#4a342a", "--matriz-color-action": "#ff842e", "--matriz-color-action-text": "#130700", "--matriz-color-focus": "#ffc14d", "--matriz-color-success": "#8ce6a2", "--matriz-color-warning": "#ffc14d", "--matriz-color-danger": "#ff6a5e", "--matriz-color-info": "#8dc9ff",
    },
  },
  {
    id: "dracula-dark", label: "Dracula Dark", description: "Roxo, rosa e amarelo no clássico tema Dracula.",
    tokens: {
      "--matriz-color-canvas": "#191a21", "--matriz-color-surface": "#282a36", "--matriz-color-text": "#f8f8f2", "--matriz-color-text-muted": "#bdc0cc", "--matriz-color-border": "#4b4e61", "--matriz-color-action": "#bd93f9", "--matriz-color-action-text": "#191a21", "--matriz-color-focus": "#8be9fd", "--matriz-color-success": "#50fa7b", "--matriz-color-warning": "#ffb86c", "--matriz-color-danger": "#ff5555", "--matriz-color-info": "#8be9fd",
    },
  },
  {
    id: "terminal-green", label: "Terminal Green", description: "Preto profundo, verde fosforescente e foco técnico.",
    tokens: {
      "--matriz-color-canvas": "#050805", "--matriz-color-surface": "#0a100b", "--matriz-color-text": "#d7ffd7", "--matriz-color-text-muted": "#8bd18b", "--matriz-color-border": "#2d5a35", "--matriz-color-action": "#39ff88", "--matriz-color-action-text": "#050805", "--matriz-color-focus": "#7dffae", "--matriz-color-success": "#39ff88", "--matriz-color-warning": "#f2d66b", "--matriz-color-danger": "#ff6b6b", "--matriz-color-info": "#73d9ff",
    },
  },
  {
    id: "quiet-depth", label: "Quiet Depth", description: "Azul ardósia escuro para foco prolongado e telas grandes.",
    tokens: {
      "--matriz-color-canvas": "#0b1118", "--matriz-color-surface": "#101a24", "--matriz-color-text": "#edf4fa", "--matriz-color-text-muted": "#a6b5c4", "--matriz-color-border": "#334657", "--matriz-color-action": "#7bc4d8", "--matriz-color-action-text": "#071015", "--matriz-color-focus": "#a8dbe7", "--matriz-color-success": "#72d6b0", "--matriz-color-warning": "#f0c678", "--matriz-color-danger": "#ff8190", "--matriz-color-info": "#83b6ff",
    },
  },
  {
    id: "soft-graphite", label: "Soft Graphite", description: "Grafite calmo, menta suave e âmbar legível.",
    tokens: {
      "--matriz-color-canvas": "#0d0f12", "--matriz-color-surface": "#14181c", "--matriz-color-text": "#edf1ef", "--matriz-color-text-muted": "#a6b0aa", "--matriz-color-border": "#35403c", "--matriz-color-action": "#a7d8c0", "--matriz-color-action-text": "#0b110e", "--matriz-color-focus": "#c6ead8", "--matriz-color-success": "#86ddb5", "--matriz-color-warning": "#e5c875", "--matriz-color-danger": "#f08b8b", "--matriz-color-info": "#8fb4e6",
    },
  },
] as const satisfies readonly OperationalTheme[]

export type OperationalThemeId = (typeof operationalThemes)[number]["id"]

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
  "matriz-identity": {
    appId: "matriz-identity", label: "Matriz Identity", brandAccent: "#4f46e5", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#111827", muted: "#eef2ff", mutedFg: "#4b5563", border: "#c7d2fe",
  },
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
  "matriz-uninstall": {
    appId: "matriz-uninstall", label: "Matriz Uninstall", brandAccent: "#c2410c", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#1c1917", muted: "#fff7ed", mutedFg: "#7c2d12", border: "#fed7aa",
  },
  sites: {
    appId: "sites", label: "Matriz Sites", brandAccent: "#4d7c0f", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#151a12", muted: "#f3f6ed", mutedFg: "#626b5b", border: "#dfe5d7",
  },
  spot: {
    appId: "spot", label: "Spot", brandAccent: "#f59e0b", brandAccentFg: "#0f172a",
    surface: "#ffffff", surfaceFg: "#1c1917", muted: "#fef3c7", mutedFg: "#78350f", border: "#fde68a",
  },
  "matriz-control": {
    appId: "matriz-control", label: "Matriz Control Web", brandAccent: "#7143a0", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#28202f", muted: "#f6f2f8", mutedFg: "#72677c", border: "#d8cfdd",
  },
  naevia: {
    appId: "naevia", label: "NAEVIA", brandAccent: "#7c5cff", brandAccentFg: "#ffffff",
    surface: "#faf9ff", surfaceFg: "#17131f", muted: "#f0edfa", mutedFg: "#686176", border: "#dcd5ea",
  },
  "matriz-admin": {
    appId: "matriz-admin", label: "Matriz Admin", brandAccent: "#6d4aff", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#17131d", muted: "#f4f1fb", mutedFg: "#625a70", border: "#ddd5e8",
  },
  "matriz-client-admin": {
    appId: "matriz-client-admin", label: "Matriz Client Admin", brandAccent: "#b88a2b", brandAccentFg: "#1f1708",
    surface: "#fffdf8", surfaceFg: "#28231a", muted: "#f7f1e5", mutedFg: "#6f6554", border: "#e6dcc8",
  },
  "matriz-ops": {
    appId: "matriz-ops", label: "Matriz Ops", brandAccent: "#6d4aff", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#17131d", muted: "#f4f1fb", mutedFg: "#625a70", border: "#ddd5e8",
  },
  "matriz-pay": {
    appId: "matriz-pay", label: "Matriz Pay", brandAccent: "#047857", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#052e16", muted: "#ecfdf5", mutedFg: "#065f46", border: "#a7f3d0",
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
  health: {
    appId: "health", label: "Health", brandAccent: "#0e7490", brandAccentFg: "#ffffff",
    surface: "#ffffff", surfaceFg: "#0f172a", muted: "#ecfeff", mutedFg: "#155e75", border: "#a5f3fc",
  },
}

export const darkAppThemes: Readonly<Record<MatrizAppId, AppThemeTokens>> = {
  "matriz-identity": {
    appId: "matriz-identity", label: "Matriz Identity", brandAccent: "#818cf8", brandAccentFg: "#090b1a",
    surface: "#0b1020", surfaceFg: "#f5f7ff", muted: "#11182b", mutedFg: "#aeb8d4", border: "#293455",
  },
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
  "matriz-uninstall": {
    appId: "matriz-uninstall", label: "Matriz Uninstall", brandAccent: "#fb923c", brandAccentFg: "#1c0a00",
    surface: "#17100c", surfaceFg: "#fff7ed", muted: "#24140c", mutedFg: "#fdba74", border: "#4a2818",
  },
  sites: {
    appId: "sites", label: "Matriz Sites", brandAccent: "#c8ff66", brandAccentFg: "#10131a",
    surface: "#171b24", surfaceFg: "#f5f7ef", muted: "#10131a", mutedFg: "#9da49a", border: "#30362f",
  },
  spot: {
    appId: "spot", label: "Spot", brandAccent: "#f6b83f", brandAccentFg: "#17110a",
    surface: "#12100c", surfaceFg: "#fff7e8", muted: "#1d1810", mutedFg: "#cbbd9f", border: "#3d3220",
  },
  "matriz-control": {
    appId: "matriz-control", label: "Matriz Control Web", brandAccent: "#9a55ff", brandAccentFg: "#ffffff",
    surface: "#08060e", surfaceFg: "#f4effb", muted: "#130c20", mutedFg: "#82778f", border: "#2a1c3d",
  },
  naevia: {
    appId: "naevia", label: "NAEVIA", brandAccent: "#9b7bff", brandAccentFg: "#0b0714",
    surface: "#0b0911", surfaceFg: "#f5f1ff", muted: "#141020", mutedFg: "#9990a8", border: "#302640",
  },
  "matriz-admin": {
    appId: "matriz-admin", label: "Matriz Admin", brandAccent: "#a98cff", brandAccentFg: "#0b0712",
    surface: "#0f0c16", surfaceFg: "#f5f1fb", muted: "#18121f", mutedFg: "#aaa0b7", border: "#362a42",
  },
  "matriz-client-admin": {
    appId: "matriz-client-admin", label: "Matriz Client Admin", brandAccent: "#d9ad52", brandAccentFg: "#211704",
    surface: "#17140e", surfaceFg: "#fbf5e8", muted: "#211c13", mutedFg: "#c8bda8", border: "#423722",
  },
  "matriz-ops": {
    appId: "matriz-ops", label: "Matriz Ops", brandAccent: "#a98cff", brandAccentFg: "#0b0712",
    surface: "#0f0c16", surfaceFg: "#f5f1fb", muted: "#18121f", mutedFg: "#aaa0b7", border: "#362a42",
  },
  "matriz-pay": {
    appId: "matriz-pay", label: "Matriz Pay", brandAccent: "#34d399", brandAccentFg: "#04130d",
    surface: "#071511", surfaceFg: "#effcf6", muted: "#0d211a", mutedFg: "#a5c7b8", border: "#244639",
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
  health: {
    appId: "health", label: "Health", brandAccent: "#22d3ee", brandAccentFg: "#083344",
    surface: "#071820", surfaceFg: "#ecfeff", muted: "#0c2430", mutedFg: "#a5d8e4", border: "#1f4f61",
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
  "matriz-identity", "matriz-hub", "matriz-desktop", "matrizlib", "matriz-workbench", "matriz-control", "naevia", "matriz-uninstall", "sites", "spot", "matriz-admin", "matriz-client-admin", "matriz-ops", "matriz-pay", "seumei", "contracts", "willdash", "health",
]

export const themeRegistry = [
  {
    key: "matriz-base", version: 1, label: "Matriz Base",
    description: "A base semântica que preserva a identidade de cada produto.", compatibleApps: ALL_MATRIZ_APPS,
  },
  {
    key: "midnight-graphite", version: 1, label: "Midnight Graphite",
    description: "Grafite profundo, violeta frio e contraste editorial.", compatibleApps: ["matriz-hub", "matriz-desktop", "matriz-workbench", "naevia", "sites"],
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
  mode: MatrizColorMode = appId === "matriz-hub" || appId === "matriz-desktop" || appId === "matriz-workbench" || appId === "matriz-control" ? "dark" : "light",
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
