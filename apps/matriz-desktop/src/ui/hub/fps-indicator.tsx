import { useEffect, useState } from "react"

export function FpsIndicator({ onSample }: { onSample?(fps: number): void }) {
  const [fps, setFps] = useState<number>()

  useEffect(() => {
    let frameId = 0
    let frames = 0
    let sampledAt: number | undefined
    const sample = (timestamp: number) => {
      frames += 1
      sampledAt ??= timestamp
      const elapsed = timestamp - sampledAt
      if (elapsed >= 500) {
        const next = Math.round((frames * 1_000) / elapsed)
        setFps(next)
        onSample?.(next)
        frames = 0
        sampledAt = timestamp
      }
      frameId = requestAnimationFrame(sample)
    }
    frameId = requestAnimationFrame(sample)
    return () => cancelAnimationFrame(frameId)
  }, [onSample])

  return <span className="fps-indicator" aria-label="FPS da interface">FPS {fps ?? "—"}</span>
}
