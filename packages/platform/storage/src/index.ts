/**
 * @matriz/platform-storage
 *
 * Minimal in-memory + localStorage key/value store. Used by mock repositories
 * across apps (L5 — repositories depend on this abstraction, not on raw
 * localStorage).
 *
 * L12: no domain logic — only primitives for persistence.
 */
import { safeJsonParse, safeJsonStringify } from "@matriz/foundation-utils"

export const PLATFORM_STORAGE_VERSION = "0.1.0" as const

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export interface KeyValueStore {
  readonly kind: "memory" | "local-storage"
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  remove(key: string): void
  keys(): string[]
  clear(): void
}

// ---------------------------------------------------------------------------
// In-memory implementation (SSR-safe default)
// ---------------------------------------------------------------------------

export function createInMemoryStore(): KeyValueStore {
  const map = new Map<string, string>()
  return {
    kind: "memory",
    get<T>(key: string): T | undefined {
      const raw = map.get(key)
      return raw === undefined ? undefined : (safeJsonParse<T>(raw) as T | undefined)
    },
    set<T>(key: string, value: T): void {
      map.set(key, safeJsonStringify(value))
    },
    remove(key: string): void {
      map.delete(key)
    },
    keys(): string[] {
      return [...map.keys()]
    },
    clear(): void {
      map.clear()
    },
  }
}

// ---------------------------------------------------------------------------
// LocalStorage implementation (browser-only; falls back to in-memory on SSR)
// ---------------------------------------------------------------------------

export function createLocalStorageStore(): KeyValueStore {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return createInMemoryStore()
  }
  return {
    kind: "local-storage",
    get<T>(key: string): T | undefined {
      const raw = localStorage.getItem(key)
      return raw === null ? undefined : (safeJsonParse<T>(raw) as T | undefined)
    },
    set<T>(key: string, value: T): void {
      localStorage.setItem(key, safeJsonStringify(value))
    },
    remove(key: string): void {
      localStorage.removeItem(key)
    },
    keys(): string[] {
      const out: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k !== null) out.push(k)
      }
      return out
    },
    clear(): void {
      localStorage.clear()
    },
  }
}

// ---------------------------------------------------------------------------
// Namespaced helper — prefixes keys so multiple consumers never collide
// ---------------------------------------------------------------------------

export function createNamespacedStore(
  store: KeyValueStore,
  namespace: string,
): KeyValueStore {
  const prefix = `${namespace}::`
  return {
    kind: store.kind,
    get: (key) => store.get(`${prefix}${key}`),
    set: (key, value) => store.set(`${prefix}${key}`, value),
    remove: (key) => store.remove(`${prefix}${key}`),
    keys: () =>
      store
        .keys()
        .filter((k) => k.startsWith(prefix))
        .map((k) => k.slice(prefix.length)),
    clear: () => {
      for (const k of store.keys()) if (k.startsWith(prefix)) store.remove(k)
    },
  }
}

/**
 * Picks LocalStorage in the browser, in-memory on the server. Always safe to
 * call at module scope.
 */
export function createDefaultStore(namespace?: string): KeyValueStore {
  const base =
    typeof window === "undefined" ? createInMemoryStore() : createLocalStorageStore()
  return namespace ? createNamespacedStore(base, namespace) : base
}
