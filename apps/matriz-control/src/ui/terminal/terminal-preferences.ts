export interface TerminalPreferences { open: boolean; placement: "bottom" | "right"; bottomSize: number; rightSize: number; activeSessionId: string | null }
export const DEFAULT_TERMINAL_PREFERENCES: TerminalPreferences = { open: false, placement: "bottom", bottomSize: 320, rightSize: 520, activeSessionId: null }

const clamp = (value: unknown, min: number, max: number, fallback: number) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

export function parseTerminalPreferences(raw: string | null): TerminalPreferences {
  try {
    const value = JSON.parse(raw ?? "null") as Record<string, unknown> | null
    if (!value) return { ...DEFAULT_TERMINAL_PREFERENCES }
    return {
      open: value.open === true,
      placement: value.placement === "right" ? "right" : "bottom",
      bottomSize: clamp(value.bottomSize, 180, 720, 320),
      rightSize: clamp(value.rightSize, 360, 900, 520),
      activeSessionId: typeof value.activeSessionId === "string" ? value.activeSessionId : null,
    }
  } catch { return { ...DEFAULT_TERMINAL_PREFERENCES } }
}
