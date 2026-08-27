import { describe, expect, it, vi } from "vitest"
import { createOperationalSoundFeedback } from "./operational-sounds"

describe("operational sound feedback", () => {
  it("stays silent until the user opts in", async () => {
    const play = vi.fn()
    const feedback = createOperationalSoundFeedback({ play, isOptedIn: () => false, prefersReducedMotion: () => false })
    await feedback("success")
    expect(play).not.toHaveBeenCalled()
  })

  it("stays silent when reduced motion is preferred", async () => {
    const play = vi.fn()
    const feedback = createOperationalSoundFeedback({ play, isOptedIn: () => true, prefersReducedMotion: () => true })
    await feedback("failure")
    expect(play).not.toHaveBeenCalled()
  })

  it.each([
    ["execution", "interaction"],
    ["success", "success"],
    ["failure", "error"],
    ["attention", "warning"],
  ] as const)("maps %s to %s", async (event, soundId) => {
    const play = vi.fn().mockResolvedValue(undefined)
    const feedback = createOperationalSoundFeedback({ play, isOptedIn: () => true, prefersReducedMotion: () => false })
    await feedback(event)
    expect(play).toHaveBeenCalledWith(soundId)
  })
})
