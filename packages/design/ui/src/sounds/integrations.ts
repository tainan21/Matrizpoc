import { sound, type SoundPlayResult, type SoundSystem } from "./system"
import type { SoundId } from "./types"

export interface SoundFeedbackOptions {
  readonly soundSystem?: SoundSystem
}

export function playNavigationFeedback(
  options: SoundFeedbackOptions = {},
): Promise<SoundPlayResult> {
  return (options.soundSystem ?? sound).play("navigation")
}

export function playInteractionFeedback(
  id: Extract<SoundId, "interaction" | "open" | "close"> = "interaction",
  options: SoundFeedbackOptions = {},
): Promise<SoundPlayResult> {
  return (options.soundSystem ?? sound).play(id)
}
