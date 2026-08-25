import { z } from "zod"

export const DATA_NATURE_VALUES = [
  "observed",
  "derived",
  "declared",
  "simulated",
] as const

export const FRESHNESS_VALUES = ["fresh", "stale", "expired", "unknown"] as const

export const CONFIDENCE_VALUES = [
  "verified",
  "trusted",
  "unverified",
  "unknown",
] as const

export const observationErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  occurredAt: z.string().datetime(),
})

export const observationMetaSchema = z
  .object({
    sourceId: z.string().min(1),
    nature: z.enum(DATA_NATURE_VALUES),
    observedAt: z.string().datetime().optional(),
    collectedAt: z.string().datetime(),
    expiresAt: z.string().datetime().optional(),
    freshness: z.enum(FRESHNESS_VALUES),
    confidence: z.enum(CONFIDENCE_VALUES),
    lastError: observationErrorSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.nature === "observed" && !value.observedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["observedAt"],
        message: "observedAt is required when nature is observed",
      })
    }
  })

export type DataNature = (typeof DATA_NATURE_VALUES)[number]
export type Freshness = (typeof FRESHNESS_VALUES)[number]
export type Confidence = (typeof CONFIDENCE_VALUES)[number]
export type ObservationError = z.infer<typeof observationErrorSchema>
export type ObservationMeta = z.infer<typeof observationMetaSchema>
