import { describe, expect, it, vi } from "vitest"

import { createWebView2Environment, removeTemporaryRoot, waitForCdpEndpoint } from "./native-process"

describe("native Playwright process", () => {
  it("isolates WebView2 state and replaces inherited remote-debugging arguments", () => {
    expect(createWebView2Environment({
      baseEnvironment: {
        NODE_ENV: "test",
        WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9000 --disable-gpu",
      },
      cdpPort: 43117,
      profileDirectory: "C:\\Temp\\matriz-control-e2e\\webview2",
      configDirectory: "C:\\Temp\\matriz-control-e2e\\config",
    })).toEqual({
      NODE_ENV: "test",
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=43117",
      WEBVIEW2_USER_DATA_FOLDER: "C:\\Temp\\matriz-control-e2e\\webview2",
      MATRIZ_CONTROL_ACCEPTANCE: "1",
      MATRIZ_CONTROL_ACCEPTANCE_CONFIG_DIR: "C:\\Temp\\matriz-control-e2e\\config",
    })
  })

  it("waits for a usable CDP endpoint instead of sleeping for a fixed duration", async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new Error("not listening"))
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true })
    const pause = vi.fn(async () => undefined)

    await expect(waitForCdpEndpoint({ cdpPort: 43117, timeoutMs: 100, request, pause, now: incrementalClock() })).resolves.toBe("http://127.0.0.1:43117")
    expect(request).toHaveBeenCalledTimes(3)
    expect(pause).toHaveBeenCalledTimes(2)
  })

  it("fails with the endpoint in the error when WebView2 never becomes ready", async () => {
    const request = vi.fn(async () => ({ ok: false }))

    await expect(waitForCdpEndpoint({
      cdpPort: 43118,
      timeoutMs: 10,
      request,
      pause: async () => undefined,
      now: incrementalClock(6),
    })).rejects.toThrow("http://127.0.0.1:43118/json/version")
  })

  it("retries only transient WebView2 lock errors before removing the isolated profile", async () => {
    const busy = Object.assign(new Error("profile locked"), { code: "EBUSY" })
    const remove = vi.fn().mockRejectedValueOnce(busy).mockResolvedValueOnce(undefined)
    const pause = vi.fn(async () => undefined)

    await removeTemporaryRoot({
      root: "C:\\Temp\\matriz-control-playwright-run",
      temporaryRoot: "C:\\Temp",
      remove,
      pause,
    })

    expect(remove).toHaveBeenCalledTimes(2)
    expect(pause).toHaveBeenCalledOnce()
  })

  it("allows a WebView2 subprocess time to release its profile lock", async () => {
    const busy = Object.assign(new Error("profile locked"), { code: "EBUSY" })
    const remove = vi.fn()
    for (let attempt = 0; attempt < 75; attempt += 1) remove.mockRejectedValueOnce(busy)
    remove.mockResolvedValueOnce(undefined)

    await expect(removeTemporaryRoot({
      root: "C:\\Temp\\matriz-control-playwright-run",
      temporaryRoot: "C:\\Temp",
      remove,
      pause: async () => undefined,
    })).resolves.toBeUndefined()
    expect(remove).toHaveBeenCalledTimes(76)
  })
})

function incrementalClock(step = 1): () => number {
  let value = 0
  return () => {
    value += step
    return value
  }
}
