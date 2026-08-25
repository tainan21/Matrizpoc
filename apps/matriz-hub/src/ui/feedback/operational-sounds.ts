import { sound, type SoundId } from "@matriz/design-ui/sounds"

export type OperationalSoundEvent = "execution" | "success" | "failure" | "attention"
export const HUB_OPERATIONAL_SOUNDS_KEY = "matriz-hub:operational-sounds:v1"

const soundByEvent: Record<OperationalSoundEvent, SoundId> = {
  execution: "interaction",
  success: "success",
  failure: "error",
  attention: "warning",
}

interface FeedbackDependencies {
  readonly play: (id: SoundId) => Promise<unknown>
  readonly isOptedIn: () => boolean
  readonly prefersReducedMotion: () => boolean
}

export function createOperationalSoundFeedback(dependencies: FeedbackDependencies) {
  return async (event: OperationalSoundEvent): Promise<void> => {
    if (!dependencies.isOptedIn() || dependencies.prefersReducedMotion()) return
    await dependencies.play(soundByEvent[event])
  }
}

export function operationalSoundsEnabled(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(HUB_OPERATIONAL_SOUNDS_KEY) === "enabled"
}

export function setOperationalSoundsEnabled(enabled: boolean): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(HUB_OPERATIONAL_SOUNDS_KEY, enabled ? "enabled" : "disabled")
  }
}

export const playOperationalSound = createOperationalSoundFeedback({
  play: (id) => sound.play(id),
  isOptedIn: operationalSoundsEnabled,
  prefersReducedMotion: () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
})
