/**
 * @matriz/design-system
 *
 * Visual tokens and per-app theme descriptors. Pure data — no React, no
 * domain. Tailwind classes are composed elsewhere (apps + design/ui) using
 * these tokens as the single source of truth for visual identity.
 *
 * Governed by L4 (design must not depend on integration/flows/domain) and
 * L12 (no business rules).
 */
import type { MatrizAppId } from "@matriz/foundation-constants"

export const DESIGN_SYSTEM_VERSION = "0.1.0" as const

// ---------------------------------------------------------------------------
// Scales (global, shared across every app)
// ---------------------------------------------------------------------------

export const spacingScale = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
} as const
export type SpacingToken = keyof typeof spacingScale

export const radiusScale = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
} as const
export type RadiusToken = keyof typeof radiusScale

export const fontFamily = {
  sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
  mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
} as const

export const fontSizeScale = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
} as const

// ---------------------------------------------------------------------------
// Per-app theme
// ---------------------------------------------------------------------------

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

/**
 * Per-app palettes. Each app gets a distinct brand accent; neutrals are
 * shared for visual coherence across the Matriz ecosystem. Maximum of 5
 * distinct colors per palette (brand + 2 neutrals + 2 states).
 */
export const appThemes: Readonly<Record<MatrizAppId, AppThemeTokens>> = {
  "matriz-hub": {
    appId: "matriz-hub",
    label: "Matriz Hub",
    brandAccent: "#0f172a",
    brandAccentFg: "#f8fafc",
    surface: "#ffffff",
    surfaceFg: "#0f172a",
    muted: "#f1f5f9",
    mutedFg: "#475569",
    border: "#e2e8f0",
  },
  spot: {
    appId: "spot",
    label: "Spot",
    brandAccent: "#f59e0b",
    brandAccentFg: "#0f172a",
    surface: "#ffffff",
    surfaceFg: "#1c1917",
    muted: "#fef3c7",
    mutedFg: "#78350f",
    border: "#fde68a",
  },
  seumei: {
    appId: "seumei",
    label: "Seu Mei",
    brandAccent: "#059669",
    brandAccentFg: "#ffffff",
    surface: "#ffffff",
    surfaceFg: "#052e16",
    muted: "#ecfdf5",
    mutedFg: "#065f46",
    border: "#a7f3d0",
  },
  contracts: {
    appId: "contracts",
    label: "Contracts",
    brandAccent: "#2563eb",
    brandAccentFg: "#ffffff",
    surface: "#ffffff",
    surfaceFg: "#0f172a",
    muted: "#eff6ff",
    mutedFg: "#1e3a8a",
    border: "#bfdbfe",
  },
  willdash: {
    appId: "willdash",
    label: "WillDash",
    brandAccent: "#db2777",
    brandAccentFg: "#ffffff",
    surface: "#ffffff",
    surfaceFg: "#1f2937",
    muted: "#fdf2f8",
    mutedFg: "#831843",
    border: "#fbcfe8",
  },
}

export const getAppTheme = (appId: MatrizAppId): AppThemeTokens =>
  appThemes[appId]

/**
 * Emits CSS custom-property declarations for an app theme. Apps set these on
 * their `<html>` element so Tailwind utility classes (e.g. `text-brand`) resolve
 * consistently.
 */
export function themeToCssVars(theme: AppThemeTokens): Record<string, string> {
  return {
    "--brand": theme.brandAccent,
    "--brand-fg": theme.brandAccentFg,
    "--surface": theme.surface,
    "--surface-fg": theme.surfaceFg,
    "--muted": theme.muted,
    "--muted-fg": theme.mutedFg,
    "--border": theme.border,
    "--color-background": theme.muted,
    "--color-foreground": theme.surfaceFg,
    "--color-surface": theme.surface,
    "--color-surface-foreground": theme.surfaceFg,
    "--color-muted": theme.muted,
    "--color-muted-foreground": theme.mutedFg,
    "--color-border": theme.border,
    "--color-primary": theme.brandAccent,
    "--color-primary-foreground": theme.brandAccentFg,
  }
}
