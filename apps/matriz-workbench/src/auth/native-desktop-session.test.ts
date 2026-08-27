import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { proxy } from "../../proxy"
import { SESSION_COOKIE } from "./session"

const originalEnvironment = { ...process.env }

afterEach(() => {
  vi.unstubAllEnvs()
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key]
  }
  Object.assign(process.env, originalEnvironment)
})

describe("native desktop session", () => {
  it("rejects a native request that was not provisioned by the Electron shell", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("WORKBENCH_RUNTIME_MODE", "native-desktop")
    vi.stubEnv("WORKBENCH_LOCAL_TOKEN", "native-desktop-session-token")

    const response = await proxy(new NextRequest("http://127.0.0.1:3005/"))
    expect(response.status).toBe(307)
    expect(response.headers.get("set-cookie")).toBeNull()
    expect(response.headers.get("location")).toMatch(/\/unlock$/)
  })

  it("accepts the HTTP-only proof provisioned by Electron", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("WORKBENCH_RUNTIME_MODE", "native-desktop")
    vi.stubEnv("WORKBENCH_LOCAL_TOKEN", "native-desktop-session-token")
    const digest = await import("./local-access").then(({ localSessionDigest }) => localSessionDigest())

    const response = await proxy(new NextRequest("http://127.0.0.1:3005/", {
      headers: { cookie: `${SESSION_COOKIE}=${digest}` },
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get("set-cookie")).toBeNull()
  })
})
