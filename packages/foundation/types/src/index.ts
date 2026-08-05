/**
 * @matriz/foundation-types
 *
 * Public base types shared across the entire monorepo. Zero runtime code
 * (only the version constant).
 * Governed by Architectural Law L12 — no domain concepts of apps here.
 * Governed by Architectural Law L7 — branded types to prevent accidental
 * substitution between versioned identifiers.
 */

export const FOUNDATION_TYPES_VERSION = "0.1.0" as const

// ---------------------------------------------------------------------------
// Brand (nominal typing)
// ---------------------------------------------------------------------------

/** A branded primitive. Use to prevent accidental mixing of semantic IDs. */
export type Brand<T, K extends string> = T & { readonly __brand: K }

// ---------------------------------------------------------------------------
// Core branded identities
// ---------------------------------------------------------------------------

export type Id = Brand<string, "Id">
export type TenantId = Brand<string, "TenantId">
export type UserId = Brand<string, "UserId">
export type MembershipId = Brand<string, "MembershipId">

/** Canonical list of known app IDs (mirrors foundation-constants). */
export type AppIdLiteral =
  | "matriz-hub"
  | "matriz-workbench"
  | "sites"
  | "spot"
  | "seumei"
  | "contracts"
  | "willdash"

export type AppId = Brand<AppIdLiteral, "AppId">

/** ISO 8601 string (UTC). */
export type ISODateString = Brand<string, "ISODateString">

// ---------------------------------------------------------------------------
// Generic primitives
// ---------------------------------------------------------------------------

export type Nullable<T> = T | null
export type Maybe<T> = T | null | undefined
export type Prettify<T> = { [K in keyof T]: T[K] } & {}
export type NonEmptyArray<T> = [T, ...T[]]
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K]
}

// ---------------------------------------------------------------------------
// Result pattern — preferred over throwing in use-cases
// ---------------------------------------------------------------------------

export type Ok<T> = { readonly ok: true; readonly value: T }
export type Err<E = string> = { readonly ok: false; readonly error: E }
export type Result<T, E = string> = Ok<T> | Err<E>

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
export const err = <E = string>(error: E): Err<E> => ({ ok: false, error })

// ---------------------------------------------------------------------------
// Typed constructors (zero-runtime brand casts)
// ---------------------------------------------------------------------------

export const asId = (raw: string): Id => raw as Id
export const asTenantId = (raw: string): TenantId => raw as TenantId
export const asUserId = (raw: string): UserId => raw as UserId
export const asMembershipId = (raw: string): MembershipId => raw as MembershipId
export const asAppId = (raw: AppIdLiteral): AppId => raw as AppId
export const asISODate = (raw: string): ISODateString => raw as ISODateString
