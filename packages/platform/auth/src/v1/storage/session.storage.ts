/**
 * Session storage adapter. Sits on top of `@matriz/platform-storage` so
 * the UI never touches `localStorage` directly (L5).
 *
 * The interface is intentionally narrow so a future swap to cookie /
 * HTTP-only JWT / encrypted secure storage does not touch any consumer.
 */
import {
  createDefaultStore,
  createNamespacedStore,
  type KeyValueStore,
} from "@matriz/platform-storage"
import type { AppId } from "@matriz/foundation-types"
import type { SessionSnapshot } from "../contracts"

const SESSION_KEY = "session"

export interface SessionStorage {
  load(): SessionSnapshot | undefined
  save(snapshot: SessionSnapshot): void
  clear(): void
  readonly backendKind: KeyValueStore["kind"]
}

/**
 * Builds a namespaced session storage bound to an app. Each app gets its
 * own namespace (`matriz.auth.<appId>`) so logging out of Spot does not
 * evict Hub's session.
 */
export function createAppSessionStorage(appId: AppId): SessionStorage {
  const base = createDefaultStore()
  const ns = createNamespacedStore(base, `matriz.auth.${appId}`)
  return wrap(ns)
}

/**
 * Test helper — builds a session storage from any injected key/value
 * store. Useful for in-memory smoke tests.
 */
export function createSessionStorageFrom(store: KeyValueStore): SessionStorage {
  return wrap(store)
}

function wrap(store: KeyValueStore): SessionStorage {
  return {
    backendKind: store.kind,
    load(): SessionSnapshot | undefined {
      const raw = store.get<SessionSnapshot>(SESSION_KEY)
      if (!raw) return undefined
      if (raw.v !== 1) return undefined
      return raw
    },
    save(snapshot: SessionSnapshot): void {
      store.set(SESSION_KEY, snapshot)
    },
    clear(): void {
      store.remove(SESSION_KEY)
    },
  }
}
