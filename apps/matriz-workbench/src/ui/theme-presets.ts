import type { WorkbenchColorMode, WorkbenchDesignSystemId } from "./theme"

export interface WorkbenchThemeTokens {
  canvas: string
  surface1: string
  surface2: string
  surface3: string
  overlay: string
  text: string
  textSecondary: string
  textSubtle: string
  border: string
  borderStrong: string
  accent: string
  accentText: string
  accentHover: string
  accentSoft: string
  focus: string
  success: string
  successSoft: string
  warning: string
  warningSoft: string
  danger: string
  dangerSoft: string
  info: string
  infoSoft: string
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
  radiusSmall: string
  radiusMedium: string
  borderWidth: string
  shadowSmall: string
  shadowMedium: string
  density: string
}

export interface WorkbenchThemePreset {
  id: WorkbenchDesignSystemId
  label: string
  description: string
  tokens: WorkbenchThemeTokens
}

const semantic = {
  success: "#39c77a",
  successSoft: "#0c2d1d",
  warning: "#f2ad4f",
  warningSoft: "#35240d",
  danger: "#f06b78",
  dangerSoft: "#35141b",
  info: "#58a6ff",
  infoSoft: "#102846",
} as const

function darkTokens(
  values: Pick<WorkbenchThemeTokens, "canvas" | "surface1" | "surface2" | "surface3" | "overlay" | "text" | "textSecondary" | "textSubtle" | "border" | "borderStrong" | "accent" | "accentHover" | "accentSoft" | "focus" | "chart1" | "chart2" | "chart3" | "chart4" | "chart5"> & Partial<Pick<WorkbenchThemeTokens, "radiusSmall" | "radiusMedium" | "borderWidth" | "shadowSmall" | "shadowMedium" | "density">>,
): WorkbenchThemeTokens {
  return {
    ...semantic,
    accentText: "#070b13",
    radiusSmall: "5px",
    radiusMedium: "8px",
    borderWidth: "1px",
    shadowSmall: "0 1px 3px #0007",
    shadowMedium: "0 18px 48px #0008",
    density: "1",
    ...values,
  }
}

export const LIGHT_THEME_TOKENS: WorkbenchThemeTokens = {
  canvas: "#f7f7f8", surface1: "#ffffff", surface2: "#fafafa", surface3: "#f0f1f4", overlay: "#ffffffed",
  text: "#18181d", textSecondary: "#555865", textSubtle: "#6d6e79", border: "#e1e2e7", borderStrong: "#c8cad2",
  accent: "#5b5bd6", accentText: "#ffffff", accentHover: "#4848bd", accentSoft: "#eeeeff", focus: "#4f46e5",
  success: "#18794e", successSoft: "#e7f7ef", warning: "#9a5b00", warningSoft: "#fff2d8", danger: "#c53243", dangerSoft: "#fdecef", info: "#175cd3", infoSoft: "#eaf2ff",
  chart1: "#5b5bd6", chart2: "#0f8a78", chart3: "#c56a15", chart4: "#be3f79", chart5: "#3975c6",
  radiusSmall: "5px", radiusMedium: "8px", borderWidth: "1px", shadowSmall: "0 1px 3px #18181d16", shadowMedium: "0 18px 48px #18181d24", density: "1",
}

export const WORKBENCH_THEME_PRESETS: readonly WorkbenchThemePreset[] = [
  { id: "default", label: "Default", description: "Violeta equilibrado e neutros frios.", tokens: darkTokens({ canvas: "#0d0e14", surface1: "#14151d", surface2: "#1a1b25", surface3: "#222431", overlay: "#11121aee", text: "#f3f3f7", textSecondary: "#c0c2ce", textSubtle: "#8e91a2", border: "#2b2d39", borderStrong: "#414453", accent: "#8b7cf6", accentHover: "#a99cff", accentSoft: "#292548", focus: "#b1a7ff", chart1: "#8b7cf6", chart2: "#45b9ad", chart3: "#e3a24a", chart4: "#dc6f9f", chart5: "#669be8" }) },
  { id: "neo-brutal", label: "Neo Brutal", description: "Contraste alto, bordas firmes e sombra seca.", tokens: darkTokens({ canvas: "#08090b", surface1: "#111216", surface2: "#17191e", surface3: "#20232a", overlay: "#0b0c0ff5", text: "#ffffff", textSecondary: "#d7dae0", textSubtle: "#a3a7b0", border: "#656b76", borderStrong: "#f3f4f6", accent: "#b99cff", accentHover: "#d1bdff", accentSoft: "#3a285e", focus: "#f9df50", chart1: "#b99cff", chart2: "#44e4c3", chart3: "#f9df50", chart4: "#ff6b9e", chart5: "#70a5ff", radiusSmall: "1px", radiusMedium: "2px", borderWidth: "2px", shadowSmall: "4px 4px 0 #000", shadowMedium: "8px 8px 0 #000", density: ".96" }) },
  { id: "midnight-graphite", label: "Midnight Graphite", description: "Grafite, violeta frio e ciano técnico.", tokens: darkTokens({ canvas: "#070b13", surface1: "#0b111b", surface2: "#101824", surface3: "#151f2d", overlay: "#090e17ee", text: "#f4f6fb", textSecondary: "#aeb7c7", textSubtle: "#778195", border: "#202a3a", borderStrong: "#303b50", accent: "#8b5cf6", accentHover: "#a78bfa", accentSoft: "#2a174f", focus: "#b59aff", chart1: "#8b5cf6", chart2: "#22d3ee", chart3: "#34d399", chart4: "#f59e0b", chart5: "#f472b6" }) },
  { id: "pearl-light", label: "Pearl Light", description: "Azul perolado sobre grafite limpo.", tokens: darkTokens({ canvas: "#0a1018", surface1: "#111a24", surface2: "#172331", surface3: "#1d2c3c", overlay: "#0e1720eb", text: "#f5f9ff", textSecondary: "#c5d0dc", textSubtle: "#8fa0b2", border: "#2a3949", borderStrong: "#44586c", accent: "#89bfff", accentHover: "#b0d5ff", accentSoft: "#183653", focus: "#b7dcff", chart1: "#89bfff", chart2: "#76d7c4", chart3: "#b8a5ff", chart4: "#f2bd75", chart5: "#ee8fad" }) },
  { id: "aurora", label: "Aurora", description: "Ciano e teal para um cockpit tecnológico.", tokens: darkTokens({ canvas: "#031019", surface1: "#071a25", surface2: "#0b2430", surface3: "#10303d", overlay: "#061720ed", text: "#edfaff", textSecondary: "#b2d1db", textSubtle: "#7399a5", border: "#153747", borderStrong: "#275469", accent: "#08b8d6", accentHover: "#32d0e9", accentSoft: "#073a49", focus: "#63e6ff", chart1: "#08b8d6", chart2: "#22c993", chart3: "#4b8dff", chart4: "#e8af45", chart5: "#c071ff" }) },
  { id: "zen", label: "Zen", description: "Neutros reduzidos e máxima legibilidade.", tokens: darkTokens({ canvas: "#101213", surface1: "#16191a", surface2: "#1d2021", surface3: "#242829", overlay: "#141718ef", text: "#f1f3f2", textSecondary: "#c2c7c4", textSubtle: "#8e9691", border: "#303634", borderStrong: "#474f4b", accent: "#91b7a1", accentHover: "#afd0bd", accentSoft: "#26372e", focus: "#c5e2d1", chart1: "#91b7a1", chart2: "#87aebe", chart3: "#b6a27d", chart4: "#ad8fa0", chart5: "#8e9ec2", shadowSmall: "none", shadowMedium: "0 12px 30px #0005", density: "1.03" }) },
  { id: "pulse", label: "Pulse", description: "Magenta, rosa e laranja com energia controlada.", tokens: darkTokens({ canvas: "#0d0910", surface1: "#171019", surface2: "#211622", surface3: "#2d1c2c", overlay: "#120b14f0", text: "#fff4fa", textSecondary: "#d8bdcc", textSubtle: "#a27e92", border: "#3b2537", borderStrong: "#59344e", accent: "#e24f92", accentHover: "#fa71aa", accentSoft: "#4c1733", focus: "#ff91c0", chart1: "#e24f92", chart2: "#f18845", chart3: "#a66cff", chart4: "#42cdb4", chart5: "#ffd05a" }) },
  { id: "terra", label: "Terra", description: "Âmbar, oliva e superfícies quentes.", tokens: darkTokens({ canvas: "#100e0a", surface1: "#19160f", surface2: "#221e15", surface3: "#2d281b", overlay: "#15120ded", text: "#f9f4e7", textSecondary: "#d0c6ad", textSubtle: "#958b73", border: "#393222", borderStrong: "#554b31", accent: "#d59a3a", accentHover: "#edb755", accentSoft: "#443017", focus: "#ffd078", chart1: "#d59a3a", chart2: "#9faf55", chart3: "#c76f50", chart4: "#75a99b", chart5: "#b584bc" }) },
  { id: "dracula", label: "Dracula", description: "Roxo, ciano e rosa sobre fundo aubergine.", tokens: darkTokens({ canvas: "#17131f", surface1: "#201a2b", surface2: "#292235", surface3: "#342b42", overlay: "#1b1624ef", text: "#f8f3ff", textSecondary: "#cbbfda", textSubtle: "#9385a6", border: "#40364f", borderStrong: "#5c4d70", accent: "#bd82ff", accentHover: "#d4a9ff", accentSoft: "#452667", focus: "#e0c0ff", chart1: "#bd82ff", chart2: "#65e8df", chart3: "#ff79b0", chart4: "#f4c06a", chart5: "#70a7ff" }) },
  { id: "glass", label: "Glass", description: "Transparência moderada reservada a overlays.", tokens: darkTokens({ canvas: "#07101b", surface1: "#0d1724e8", surface2: "#142131dc", surface3: "#1c2b3ddd", overlay: "#101b2ac9", text: "#f2f7ff", textSecondary: "#bcc9d8", textSubtle: "#8192a6", border: "#ffffff18", borderStrong: "#a9c9e23d", accent: "#8b7cff", accentHover: "#aca2ff", accentSoft: "#6d5be62e", focus: "#9de8ff", chart1: "#8b7cff", chart2: "#3bd9d0", chart3: "#74a9ff", chart4: "#f1a665", chart5: "#e479c7", radiusSmall: "8px", radiusMedium: "12px", shadowSmall: "0 8px 24px #0005", shadowMedium: "0 24px 70px #0008" }) },
] as const

export function getThemePreset(id: WorkbenchDesignSystemId): WorkbenchThemePreset {
  return WORKBENCH_THEME_PRESETS.find((preset) => preset.id === id) ?? WORKBENCH_THEME_PRESETS[2]
}

export function getAppearanceTokens(mode: WorkbenchColorMode, system: WorkbenchDesignSystemId): WorkbenchThemeTokens {
  return mode === "light" ? LIGHT_THEME_TOKENS : getThemePreset(system).tokens
}

export function getAppearanceVariables(mode: WorkbenchColorMode, system: WorkbenchDesignSystemId): Record<`--wb-${string}`, string> {
  const tokens = getAppearanceTokens(mode, system)
  return {
    "--wb-canvas": tokens.canvas, "--wb-surface-1": tokens.surface1, "--wb-surface-2": tokens.surface2, "--wb-surface-3": tokens.surface3,
    "--wb-overlay": tokens.overlay, "--wb-text": tokens.text, "--wb-text-secondary": tokens.textSecondary, "--wb-text-subtle": tokens.textSubtle,
    "--wb-border": tokens.border, "--wb-border-strong": tokens.borderStrong, "--wb-accent": tokens.accent, "--wb-accent-text": tokens.accentText, "--wb-accent-hover": tokens.accentHover,
    "--wb-accent-soft": tokens.accentSoft, "--wb-focus": tokens.focus, "--wb-success": tokens.success, "--wb-success-soft": tokens.successSoft,
    "--wb-warning": tokens.warning, "--wb-warning-soft": tokens.warningSoft, "--wb-danger": tokens.danger, "--wb-danger-soft": tokens.dangerSoft,
    "--wb-info": tokens.info, "--wb-info-soft": tokens.infoSoft, "--wb-chart-1": tokens.chart1, "--wb-chart-2": tokens.chart2,
    "--wb-chart-3": tokens.chart3, "--wb-chart-4": tokens.chart4, "--wb-chart-5": tokens.chart5, "--wb-radius-sm": tokens.radiusSmall,
    "--wb-radius-md": tokens.radiusMedium, "--wb-border-width": tokens.borderWidth, "--wb-shadow-sm": tokens.shadowSmall,
    "--wb-shadow-md": tokens.shadowMedium, "--wb-density": tokens.density,
  }
}

export function applyAppearanceToDocument(mode: WorkbenchColorMode, system: WorkbenchDesignSystemId): void {
  const root = document.documentElement
  root.dataset.theme = mode
  root.dataset.system = system
  for (const [name, value] of Object.entries(getAppearanceVariables(mode, system))) root.style.setProperty(name, value)
}
