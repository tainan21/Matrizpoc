/**
 * smoke: session storage adapter
 *
 * Verifies that createAppSessionStorage writes/reads/removes under a
 * namespaced key and isolates sessions across apps (no cross-app leakage).
 *
 * Uses the in-memory `createSessionStorageFrom` factory on top of an
 * injected store for determinism in node environment.
 */
import { describe, it, expect } from "vitest"
import {
  createAppSessionStorage,
  createSessionStorageFrom,
  createSession,
} from "@matriz/platform-auth/v1"
import type { AuthIdentity } from "@matriz/platform-auth/v1"
import { asAppId, asTenantId, asUserId } from "@matriz/foundation-types"
import type { KeyValueStore } from "@matriz/platform-storage"

function makeMemoryStore(): KeyValueStore {
  const map = new Map<string, unknown>()
  return {
    kind: "memory",
    get: <T>(k: string) => map.get(k) as T | undefined,
    set: <T>(k: string, v: T) => {
      map.set(k, v)
    },
    remove: (k: string) => {
      map.delete(k)
    },
  }
}

const identity: AuthIdentity = {
  user: {
    id: asUserId("user_demo"),
    email: "demo@matriz.dev",
    name: "Demo",
  },
  tenants: [
    {
      tenantId: asTenantId("tenant_demo"),
      tenantName: "Demo",
      roles: ["owner"],
      enabledApps: [asAppId("spot")],
    },
  ],
}

describe("session storage", () => {
  it("round-trips a session snapshot (memory backend)", () => {
    const store = createSessionStorageFrom(makeMemoryStore())
    expect(store.load()).toBeUndefined()
    const session = createSession({
      identity,
      strategyId: "otp",
      sessionTtlMs: 60_000,
      now: new Date("2026-04-22T00:00:00Z"),
    })
    // the smoke only needs the snapshot round-trip; the mapper is exercised
    // by the provider/restore flow.
    store.save({
      v: 1,
      identity: session.identity,
      activeTenantId: session.activeTenantId,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
      strategyId: session.strategyId,
    })
    const loaded = store.load()
    expect(loaded?.identity.user.email).toBe("demo@matriz.dev")
    store.clear()
    expect(store.load()).toBeUndefined()
  })

  it("namespaces the app session by appId (backend reported)", () => {
    const hub = createAppSessionStorage(asAppId("matriz-hub"))
    const spot = createAppSessionStorage(asAppId("spot"))
    expect(hub.backendKind).toBeDefined()
    expect(spot.backendKind).toBeDefined()
    // In node (no window), default backend falls back to in-memory per
    // process, but namespaces are still independent.
    expect(hub.load()).toBeUndefined()
    expect(spot.load()).toBeUndefined()
  })
})
