export const DESIGN_SYSTEM_VERSION = "0.1.0" as const

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

export const primitiveTokens = {
  color: {
    white: "#ffffff",
    ink: "#0f172a",
    success: "#16875b",
    warning: "#b26a14",
    danger: "#dc4655",
    info: "#3976d8",
  },
  spacing: spacingScale,
  radius: radiusScale,
  typography: {
    family: fontFamily,
    size: fontSizeScale,
  },
  elevation: {
    sm: "0 1px 2px rgb(15 23 42 / 0.08)",
    md: "0 8px 24px rgb(15 23 42 / 0.12)",
    lg: "0 20px 48px rgb(15 23 42 / 0.18)",
  },
  motion: {
    durationFast: "120ms",
    durationBase: "180ms",
    durationSlow: "280ms",
    easingStandard: "cubic-bezier(0.2, 0, 0, 1)",
  },
  focus: {
    width: "2px",
    offset: "2px",
  },
} as const

export const semanticTokenNames = [
  "--matriz-color-canvas",
  "--matriz-color-surface",
  "--matriz-color-text",
  "--matriz-color-text-muted",
  "--matriz-color-border",
  "--matriz-color-action",
  "--matriz-color-action-text",
  "--matriz-color-focus",
  "--matriz-color-success",
  "--matriz-color-warning",
  "--matriz-color-danger",
  "--matriz-color-info",
] as const

export const componentTokenNames = [
  "--matriz-focus-width",
  "--matriz-focus-offset",
  "--matriz-font-sans",
  "--matriz-font-mono",
  "--matriz-space-1",
  "--matriz-space-2",
  "--matriz-space-3",
  "--matriz-space-4",
  "--matriz-space-6",
  "--matriz-space-8",
  "--matriz-radius-sm",
  "--matriz-radius-md",
  "--matriz-radius-lg",
  "--matriz-radius-full",
  "--matriz-elevation-sm",
  "--matriz-elevation-md",
  "--matriz-elevation-lg",
  "--matriz-motion-duration-fast",
  "--matriz-motion-duration-base",
  "--matriz-motion-duration-slow",
  "--matriz-motion-easing-standard",
] as const

export type SemanticTokenName = (typeof semanticTokenNames)[number]
export type ComponentTokenName = (typeof componentTokenNames)[number]
