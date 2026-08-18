import { createBrowserSoundAudioDriver, type SoundAudioDriver } from "./driver"
import {
  DEFAULT_SOUND_PREFERENCES,
  clampSoundVolume,
  createBrowserSoundPreferenceStore,
  type SoundPreferenceStore,
  type SoundPreferences,
} from "./preferences"
import { soundRegistry } from "./registry"
import type { SoundId, SoundRegistry } from "./types"

export type SoundPlayResult =
  | { readonly status: "played"; readonly id: SoundId }
  | { readonly status: "queued"; readonly id: SoundId }
  | {
      readonly status: "skipped"
      readonly id: SoundId
      readonly reason: "disabled" | "muted" | "unsupported" | "unavailable"
    }

export interface SoundSystemState extends SoundPreferences {
  readonly initialized: boolean
  readonly playingId?: SoundId
}

export interface SoundSystem {
  initialize(options?: { readonly startup?: boolean }): Promise<SoundPlayResult | undefined>
  play(id: SoundId): Promise<SoundPlayResult>
  stop(): void
  enable(): void
  disable(): void
  mute(): void
  unmute(): void
  setVolume(value: number): void
  getVolume(): number
  isEnabled(): boolean
  isMuted(): boolean
  setPack(packId: string): void
  getPack(): string
  getState(): SoundSystemState
  subscribe(listener: (state: SoundSystemState) => void): () => void
}

interface ActivationTarget {
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
}

export interface CreateSoundSystemDependencies {
  readonly registry?: SoundRegistry
  readonly driver?: SoundAudioDriver
  readonly preferences?: SoundPreferenceStore
  readonly activationTarget?: ActivationTarget
}

function isAutoplayRejection(error: unknown): boolean {
  return error instanceof Error && error.name === "NotAllowedError"
}

export function createSoundSystem(dependencies: CreateSoundSystemDependencies = {}): SoundSystem {
  const registry = dependencies.registry ?? soundRegistry
  const preferenceStore = dependencies.preferences ?? createBrowserSoundPreferenceStore()
  const listeners = new Set<(state: SoundSystemState) => void>()
  const driver = dependencies.driver
  const activationTarget = dependencies.activationTarget
  let state: SoundSystemState = {
    ...DEFAULT_SOUND_PREFERENCES,
    initialized: false,
    playingId: undefined,
  }
  let removeActivationListeners: (() => void) | undefined

  function snapshot(): SoundSystemState {
    return Object.freeze({ ...state })
  }

  function notify(): void {
    const current = snapshot()
    for (const listener of listeners) listener(current)
  }

  function persist(): void {
    preferenceStore.write({
      enabled: state.enabled,
      muted: state.muted,
      volume: state.volume,
      packId: state.packId,
    })
  }

  function update(patch: Partial<SoundSystemState>, shouldPersist = true): void {
    state = { ...state, ...patch }
    if (shouldPersist) persist()
    notify()
  }

  function clearActivationListeners(): void {
    removeActivationListeners?.()
    removeActivationListeners = undefined
  }

  function queueForActivation(id: SoundId): void {
    if (!activationTarget || removeActivationListeners) return
    const activate: EventListener = () => {
      clearActivationListeners()
      void attemptPlay(id, false)
    }
    activationTarget.addEventListener("pointerdown", activate)
    activationTarget.addEventListener("keydown", activate)
    removeActivationListeners = () => {
      activationTarget.removeEventListener("pointerdown", activate)
      activationTarget.removeEventListener("keydown", activate)
    }
  }

  async function attemptPlay(id: SoundId, queueAutoplay: boolean): Promise<SoundPlayResult> {
    const definition = registry.getSound(id)
    if (!state.enabled || !definition.defaultEnabled) return { status: "skipped", id, reason: "disabled" }
    if (state.muted) return { status: "skipped", id, reason: "muted" }
    if (definition.status !== "available") return { status: "skipped", id, reason: "unavailable" }
    if (!driver) return { status: "skipped", id, reason: "unsupported" }
    const pack = registry.getPack(state.packId)
    const asset = pack?.assets[id]
    if (!asset) return { status: "skipped", id, reason: "unavailable" }

    if (state.playingId) {
      driver.stop()
      update({ playingId: undefined }, false)
    }
    try {
      await driver.play(asset.source, clampSoundVolume(state.volume * definition.defaultVolume), () => {
        if (state.playingId === id) update({ playingId: undefined }, false)
      })
      update({ playingId: id }, false)
      return { status: "played", id }
    } catch (error) {
      if (queueAutoplay && isAutoplayRejection(error) && activationTarget) {
        queueForActivation(id)
        return { status: "queued", id }
      }
      return { status: "skipped", id, reason: "unsupported" }
    }
  }

  const system: SoundSystem = {
    async initialize(options) {
      if (!state.initialized) {
        const persisted = preferenceStore.read()
        const packId = registry.getPack(persisted.packId)
          ? persisted.packId
          : DEFAULT_SOUND_PREFERENCES.packId
        update({ ...persisted, packId, initialized: true }, false)
      }
      return options?.startup ? attemptPlay("system.start", true) : undefined
    },
    async play(id) {
      if (!state.initialized) await system.initialize()
      return attemptPlay(id, false)
    },
    stop() {
      driver?.stop()
      if (state.playingId) update({ playingId: undefined }, false)
    },
    enable() {
      update({ enabled: true })
    },
    disable() {
      system.stop()
      update({ enabled: false })
    },
    mute() {
      system.stop()
      update({ muted: true })
    },
    unmute() {
      update({ muted: false })
    },
    setVolume(value) {
      update({ volume: clampSoundVolume(value) })
    },
    getVolume: () => state.volume,
    isEnabled: () => state.enabled,
    isMuted: () => state.muted,
    setPack(packId) {
      if (!registry.getPack(packId)) throw new Error(`Unknown sound pack ${packId}`)
      system.stop()
      update({ packId })
    },
    getPack: () => state.packId,
    getState: snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  return system
}

const browserDriver = typeof Audio === "undefined" ? undefined : createBrowserSoundAudioDriver()
const browserActivationTarget = typeof document === "undefined" ? undefined : document

export const sound = createSoundSystem({
  driver: browserDriver,
  activationTarget: browserActivationTarget,
})
