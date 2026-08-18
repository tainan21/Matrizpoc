export interface SoundPreferences {
  readonly enabled: boolean
  readonly muted: boolean
  readonly volume: number
  readonly packId: string
}

export interface SoundPreferenceStore {
  read(): SoundPreferences
  write(value: SoundPreferences): void
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const SOUND_PREFERENCES_KEY = "matriz:sound-preferences:v1"
export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = Object.freeze({
  enabled: true,
  muted: false,
  volume: 0.7,
  packId: "matriz-default",
})

export function clampSoundVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SOUND_PREFERENCES.volume
  return Math.min(1, Math.max(0, value))
}

function normalizePreferences(value: unknown): SoundPreferences {
  if (!value || typeof value !== "object") return { ...DEFAULT_SOUND_PREFERENCES }
  const candidate = value as Partial<SoundPreferences>
  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : DEFAULT_SOUND_PREFERENCES.enabled,
    muted: typeof candidate.muted === "boolean" ? candidate.muted : DEFAULT_SOUND_PREFERENCES.muted,
    volume: typeof candidate.volume === "number" ? clampSoundVolume(candidate.volume) : DEFAULT_SOUND_PREFERENCES.volume,
    packId: typeof candidate.packId === "string" && candidate.packId.length > 0 ? candidate.packId : DEFAULT_SOUND_PREFERENCES.packId,
  }
}

export function createBrowserSoundPreferenceStore(storage?: StorageLike): SoundPreferenceStore {
  let target = storage
  if (!target && typeof window !== "undefined") {
    try {
      target = window.localStorage
    } catch {
      // Storage can be denied for opaque origins or by browser policy.
    }
  }
  return {
    read() {
      if (!target) return { ...DEFAULT_SOUND_PREFERENCES }
      try {
        const raw = target.getItem(SOUND_PREFERENCES_KEY)
        return raw ? normalizePreferences(JSON.parse(raw)) : { ...DEFAULT_SOUND_PREFERENCES }
      } catch {
        return { ...DEFAULT_SOUND_PREFERENCES }
      }
    },
    write(value) {
      if (!target) return
      try {
        target.setItem(SOUND_PREFERENCES_KEY, JSON.stringify(normalizePreferences(value)))
      } catch {
        // Persistence is best-effort; sound feedback never blocks product behavior.
      }
    },
  }
}

export function createMemorySoundPreferenceStore(
  initial: SoundPreferences = DEFAULT_SOUND_PREFERENCES,
): SoundPreferenceStore {
  let current = normalizePreferences(initial)
  return {
    read: () => ({ ...current }),
    write(value) {
      current = normalizePreferences(value)
    },
  }
}
