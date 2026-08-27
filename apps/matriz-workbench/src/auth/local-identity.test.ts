import { describe, expect, it } from "vitest"
import { decodeWorkbenchIdentity, encodeWorkbenchIdentity, readHubIdentity, resolveLocalIdentity } from "./local-identity"

describe("local Workbench identity", () => {
  it("provisions the native desktop identity without depending on Hub", async () => {
    const result = await resolveLocalIdentity({
      mode: "native-desktop",
      readHubSession: async () => {
        throw new Error("Hub must not be contacted")
      },
    })

    expect(result).toEqual({
      status: "authenticated",
      identity: {
        id: "native-desktop-local",
        label: "Desktop local",
        source: "native",
        roles: ["local-operator"],
      },
    })
  })

  it("uses a verified Hub identity when the broker returns a session", async () => {
    const result = await resolveLocalIdentity({
      mode: "standalone-web",
      readHubSession: async () => ({ id: "usr_ana", name: "Ana" }),
    })

    expect(result).toEqual({
      status: "authenticated",
      identity: {
        id: "usr_ana",
        label: "Ana",
        source: "hub",
        roles: ["local-operator"],
      },
    })
  })

  it("requires normal login when Hub is reachable without a session", async () => {
    await expect(
      resolveLocalIdentity({
        mode: "standalone-web",
        readHubSession: async () => null,
      }),
    ).resolves.toEqual({ status: "login_required" })
  })

  it("falls back to a visibly local demo identity only when Hub is unavailable", async () => {
    const result = await resolveLocalIdentity({
      mode: "standalone-web",
      readHubSession: async () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:3000")
      },
    })

    expect(result).toEqual({
      status: "authenticated",
      identity: {
        id: "demo-local",
        label: "Demo local",
        source: "demo",
        roles: ["local-operator"],
      },
    })
  })

  it("maps the real Hub session response without depending on Hub internals", async () => {
    const fetcher: typeof fetch = async (_input, init) => {
      expect(init?.headers).toEqual({ cookie: "matriz_hub_session=session-token" })
      return new Response(JSON.stringify({
        identity: { user: { id: "usr_ana", name: "Ana", email: "ana@local.test" } },
        activeTenantId: "tenant_demo",
        expiresAt: "2026-08-26T00:00:00.000Z",
      }), { status: 200 })
    }

    await expect(
      readHubIdentity("matriz_hub_session=session-token", fetcher),
    ).resolves.toEqual({ id: "usr_ana", name: "Ana" })
  })

  it("returns no identity when Hub is reachable but rejects the session", async () => {
    const fetcher: typeof fetch = async () => new Response("unauthorized", { status: 401 })

    await expect(readHubIdentity("", fetcher)).resolves.toBeNull()
  })

  it("round-trips only a bounded visible identity cookie", () => {
    const identity = { id: "demo-local", label: "Demo local", source: "demo" as const, roles: ["local-operator"] as const }
    expect(decodeWorkbenchIdentity(encodeWorkbenchIdentity(identity))).toEqual(identity)
    expect(decodeWorkbenchIdentity("not-base64-json")).toBeUndefined()
  })
})
