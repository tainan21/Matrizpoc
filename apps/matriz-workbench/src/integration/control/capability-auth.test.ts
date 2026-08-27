import { describe, expect, it } from "vitest"
import { authorizeControlRequest } from "./capability-auth"

const secret = "c".repeat(64)

describe("Control capability authentication", () => {
  it("accepts an exact bearer capability from loopback", () => {
    const request = new Request("http://127.0.0.1:3005/api/control/diagnostics", {
      headers: { authorization: `Bearer ${secret}` },
    })

    expect(authorizeControlRequest(request, { WORKBENCH_CONTROL_CAPABILITY: secret })).toBeUndefined()
  })

  it("rejects missing, wrong, and non-loopback capabilities without revealing why", async () => {
    const missing = authorizeControlRequest(
      new Request("http://127.0.0.1:3005/api/control/diagnostics"),
      { WORKBENCH_CONTROL_CAPABILITY: secret },
    )
    const wrong = authorizeControlRequest(
      new Request("http://127.0.0.1:3005/api/control/diagnostics", {
        headers: { authorization: "Bearer wrong" },
      }),
      { WORKBENCH_CONTROL_CAPABILITY: secret },
    )
    const remote = authorizeControlRequest(
      new Request("http://workbench.example/api/control/diagnostics", {
        headers: { authorization: `Bearer ${secret}` },
      }),
      { WORKBENCH_CONTROL_CAPABILITY: secret },
    )

    expect([missing?.status, wrong?.status, remote?.status]).toEqual([401, 401, 403])
    await expect(wrong?.json()).resolves.toEqual({ error: "Control request denied." })
  })

  it("fails closed when no runtime capability is configured", () => {
    const request = new Request("http://127.0.0.1:3005/api/control/health", {
      headers: { authorization: `Bearer ${secret}` },
    })

    expect(authorizeControlRequest(request, {})).toMatchObject({ status: 503 })
  })
})
