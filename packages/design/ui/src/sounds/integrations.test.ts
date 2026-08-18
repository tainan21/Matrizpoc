import { describe, expect, it } from "vitest"

import { playInteractionFeedback, playNavigationFeedback } from "./integrations"
import type { SoundPlayResult, SoundSystem, SoundSystemState } from "./system"
import type { SoundId } from "./types"

function createRecordingSystem(): SoundSystem & { readonly played: SoundId[] } {
  const played: SoundId[] = []
  const state: SoundSystemState = Object.freeze({
    enabled: true,
    muted: false,
    volume: 0.7,
    packId: "matriz-default",
    initialized: true,
    playingId: undefined,
  })
  return {
    played,
    initialize: async () => undefined,
    async play(id): Promise<SoundPlayResult> {
      played.push(id)
      return { status: "played", id }
    },
    stop() {},
    enable() {},
    disable() {},
    mute() {},
    unmute() {},
    setVolume() {},
    getVolume: () => 0.7,
    isEnabled: () => true,
    isMuted: () => false,
    setPack() {},
    getPack: () => "matriz-default",
    getState: () => state,
    subscribe: () => () => undefined,
  }
}

describe("optional sound integration helpers", () => {
  it("plays navigation feedback through the injected sound system", async () => {
    const soundSystem = createRecordingSystem()

    await expect(playNavigationFeedback({ soundSystem })).resolves.toEqual({
      status: "played",
      id: "navigation",
    })
    expect(soundSystem.played).toEqual(["navigation"])
  })

  it("uses interaction by default and accepts open or close semantics", async () => {
    const soundSystem = createRecordingSystem()

    await playInteractionFeedback(undefined, { soundSystem })
    await playInteractionFeedback("open", { soundSystem })
    await playInteractionFeedback("close", { soundSystem })

    expect(soundSystem.played).toEqual(["interaction", "open", "close"])
  })
})
