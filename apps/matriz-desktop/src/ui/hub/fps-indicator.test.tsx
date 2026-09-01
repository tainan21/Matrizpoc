import "@testing-library/jest-dom/vitest"

import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { FpsIndicator } from "./fps-indicator"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("FpsIndicator", () => {
  it("publishes one sampled renderer value after roughly 500ms", () => {
    let frame: FrameRequestCallback | undefined
    const cancel = vi.fn()
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frame = callback
      return 7
    }))
    vi.stubGlobal("cancelAnimationFrame", cancel)

    const { unmount } = render(<FpsIndicator />)
    expect(screen.getByText("FPS —")).toBeVisible()

    act(() => {
      for (let index = 0; index <= 32; index += 1) frame?.(index * 16)
    })

    expect(screen.getByText("FPS 64")).toBeVisible()
    unmount()
    expect(cancel).toHaveBeenCalledWith(7)
  })
})
