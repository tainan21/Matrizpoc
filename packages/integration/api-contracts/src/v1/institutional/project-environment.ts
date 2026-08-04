import { z } from "zod"
import { observationMetaSchema } from "./observation-meta"

export const PROJECT_ENVIRONMENT_KIND_VALUES = [
  "local",
  "preview",
  "staging",
  "production",
] as const

export const PROJECT_ENVIRONMENT_STATUS_VALUES = [
  "available",
  "degraded",
  "offline",
  "unknown",
] as const

export const projectEnvironmentSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(PROJECT_ENVIRONMENT_KIND_VALUES),
    label: z.string().min(1),
    url: z.string().url().optional(),
    status: z.enum(PROJECT_ENVIRONMENT_STATUS_VALUES),
    observation: observationMetaSchema,
  })
  .superRefine((value, ctx) => {
    if (value.status !== "unknown" && value.observation.nature !== "observed") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "An operational environment status must be observed",
      })
    }
  })

export type ProjectEnvironmentKind = (typeof PROJECT_ENVIRONMENT_KIND_VALUES)[number]
export type ProjectEnvironmentStatus = (typeof PROJECT_ENVIRONMENT_STATUS_VALUES)[number]
export type ProjectEnvironment = z.infer<typeof projectEnvironmentSchema>
