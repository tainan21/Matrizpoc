export type OverviewVisualMode = "auto" | "3d" | "2d"

export const OVERVIEW_VISUAL_MODE_KEY = "matriz-hub:overview-visual-mode"

export function parseOverviewVisualMode(value: unknown): OverviewVisualMode {
  return value === "3d" || value === "2d" ? value : "auto"
}
