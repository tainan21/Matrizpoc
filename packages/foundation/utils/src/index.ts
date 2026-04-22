/**
 * @matriz/foundation-utils
 *
 * Stable utility helpers — pure functions only, mostly zero side effects.
 * L12: must remain domain-free. No app concepts allowed.
 */
import clsx, { type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------

/** Tailwind class merger (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/** Returns an ISO string with millisecond precision. */
export const nowIso = (): string => new Date().toISOString()

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/** Safe JSON parse returning undefined on error. */
export const safeJsonParse = <T>(raw: string): T | undefined => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

/** Safe JSON stringify that never throws. */
export const safeJsonStringify = (value: unknown, space?: number): string => {
  try {
    return JSON.stringify(value, null, space)
  } catch {
    return "[unserializable]"
  }
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

export const invariant: (cond: unknown, msg: string) => asserts cond = (
  cond,
  msg,
) => {
  if (!cond) throw new Error(`[matriz/invariant] ${msg}`)
}

export function assertNever(value: never, context = "assertNever"): never {
  throw new Error(`[${context}] Unexpected value: ${JSON.stringify(value)}`)
}

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>
  for (const k of keys) out[k] = obj[k]
  return out
}

export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> {
  const out = { ...obj } as Record<PropertyKey, unknown>
  for (const k of keys) delete out[k as PropertyKey]
  return out as Omit<T, K>
}

export function typedKeys<T extends object>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>
}

export function typedEntries<T extends object>(
  obj: T,
): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>
}

// ---------------------------------------------------------------------------
// Arrays
// ---------------------------------------------------------------------------

export function uniqueBy<T, K extends string | number>(
  list: readonly T[],
  keyFn: (item: T) => K,
): T[] {
  const seen = new Set<K>()
  const out: T[] = []
  for (const item of list) {
    const k = keyFn(item)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(item)
    }
  }
  return out
}

export function groupBy<T, K extends string>(
  list: readonly T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const item of list) {
    const k = keyFn(item)
    ;(out[k] ||= []).push(item)
  }
  return out
}

export function chunk<T>(list: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be > 0")
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

let _counter = 0

/**
 * Generates a readable, collision-resistant-for-POC ID:
 * `<prefix>_<ts36>_<counter36>_<rand>`. Replace with ULID/UUID for production.
 */
export function generateId(prefix = "id"): string {
  _counter = (_counter + 1) % 1_000_000
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}_${_counter.toString(36)}_${rand}`
}
