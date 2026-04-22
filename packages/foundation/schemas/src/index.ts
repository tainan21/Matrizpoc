/**
 * @matriz/foundation-schemas
 *
 * Base Zod schemas reused across packages. Kept small and domain-free (L12).
 * Used by smoke tests (L8) and by packages that expose public contracts.
 */
import { z } from "zod"
import {
  CONTRACT_VERSION_V1,
  EXTERNAL_LINK_RELATION_TYPES,
  MATRIZ_APP_IDS,
  MATRIZ_EVENT_NAMES,
} from "@matriz/foundation-constants"

export { z }

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

export const idSchema = z.string().min(1, "id cannot be empty")
export const tenantIdSchema = z.string().min(1, "tenantId cannot be empty")
export const userIdSchema = z.string().min(1, "userId cannot be empty")

/**
 * App ID restricted to the known Matriz apps list. Foundation is app-agnostic
 * by convention, but constants already exposes the canonical list, so we
 * keep schemas aligned to avoid drift.
 */
export const appIdSchema = z.enum(
  MATRIZ_APP_IDS as unknown as [string, ...string[]],
)

export const eventNameSchema = z.enum(
  MATRIZ_EVENT_NAMES as unknown as [string, ...string[]],
)

export const externalLinkRelationTypeSchema = z.enum(
  EXTERNAL_LINK_RELATION_TYPES as unknown as [string, ...string[]],
)

// ---------------------------------------------------------------------------
// Date
// ---------------------------------------------------------------------------

export const isoDateStringSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Invalid ISO date string",
  })

// ---------------------------------------------------------------------------
// Contract version (L7)
// ---------------------------------------------------------------------------

export const contractVersionSchema = z.literal(CONTRACT_VERSION_V1)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a Zod schema for a branded ID type. Runtime is plain string validation
 * (minLength >= 1); the brand is enforced only at the TS type level.
 */
export function brandedId<T extends string>(): z.ZodType<T> {
  return idSchema as unknown as z.ZodType<T>
}
