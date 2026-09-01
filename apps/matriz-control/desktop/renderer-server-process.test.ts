import { describe, expect, it, vi } from "vitest"

import { startPackagedRenderer } from "./renderer-server-process"

describe("startPackagedRenderer", () => {
  it("uses an Electron utility process without relying on ELECTRON_RUN_AS_NODE", () => {
    const processHandle = { kill: vi.fn(() => true) }
    const fork = vi.fn(() => processHandle)

    const result = startPackagedRenderer({
      fork,
      serverPath: "C:\\runtime\\server.js",
      cwd: "C:\\runtime",
      baseEnv: { PATH: "C:\\Windows", ELECTRON_RUN_AS_NODE: "stale" },
    })

    expect(result).toBe(processHandle)
    expect(fork).toHaveBeenCalledWith("C:\\runtime\\server.js", [], {
      cwd: "C:\\runtime",
      env: {
        PATH: "C:\\Windows",
        MATRIZ_CONTROL_RUNTIME: "desktop-packaged",
        HOSTNAME: "127.0.0.1",
        PORT: "3009",
      },
      serviceName: "Matriz Control Renderer",
      stdio: "ignore",
    })
  })
})
