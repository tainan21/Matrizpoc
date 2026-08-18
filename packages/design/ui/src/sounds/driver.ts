export interface SoundAudioDriver {
  play(source: string, volume: number, onEnded: () => void): Promise<void>
  stop(): void
}

export function createBrowserSoundAudioDriver(
  audioFactory: () => HTMLAudioElement = () => new Audio(),
): SoundAudioDriver {
  let active: HTMLAudioElement | undefined

  return {
    async play(source, volume, onEnded) {
      if (active) {
        active.pause()
        active.currentTime = 0
      }
      const audio = audioFactory()
      audio.preload = "auto"
      audio.src = source
      audio.volume = volume
      audio.onended = onEnded
      active = audio
      await audio.play()
    },
    stop() {
      if (!active) return
      active.pause()
      active.currentTime = 0
      active.onended = null
      active = undefined
    },
  }
}
