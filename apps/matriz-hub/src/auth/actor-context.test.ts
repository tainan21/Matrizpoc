import { describe, expect, it } from "vitest"
import { mockAuthState, sessionResponse } from "./mock-auth-server"
import { resolveHubActor } from "./actor-context"

function requestFor(accountId: string): Request {
  const result = mockAuthState.signInWithGoogle(accountId)
  if (!result.ok) throw new Error(result.error.message)
  const response = sessionResponse(new Request("http://localhost:3000/api/auth/mock/google"), result.value)
  const cookie = response.headers.get("set-cookie")?.split(";")[0]
  return new Request("http://localhost:3000/api/capabilities/appearance", { headers: cookie ? { cookie } : undefined })
}

describe("request-bound capability identity", () => {
  it("does not authorize requests without their own session cookie", () => {
    requestFor("google-ana")
    expect(resolveHubActor(new Request("http://localhost:3000/api/capabilities/appearance"))).toBeNull()
  })

  it("keeps concurrent mock identities isolated by opaque cookie", () => {
    const anaRequest = requestFor("google-ana")
    const caioRequest = requestFor("google-caio")

    expect(resolveHubActor(anaRequest)?.userId).not.toBe(resolveHubActor(caioRequest)?.userId)
  })
})
