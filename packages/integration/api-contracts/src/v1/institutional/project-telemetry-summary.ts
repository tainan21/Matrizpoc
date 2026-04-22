/**
 * ProjectTelemetrySummary (v1, institutional).
 *
 * Resumo agregado da telemetria institucional por categoria. NAO e o envelope
 * cru (esse e TelemetryEventDTO, no barrel tecnico). Aqui e o consolidado que
 * o Hub control plane renderiza em /intelligence. Domain-free.
 */
import { z } from "zod"

export const TELEMETRY_CATEGORY_VALUES = [
  "operational",
  "commercial",
  "financial",
  "adoption",
  "ecosystem",
  "institutional",
] as const

export const telemetryCategorySchema = z.enum(TELEMETRY_CATEGORY_VALUES)
export type TelemetryCategory = z.infer<typeof telemetryCategorySchema>

export const TELEMETRY_WINDOW_VALUES = ["1h", "24h", "7d"] as const
export const telemetryWindowSchema = z.enum(TELEMETRY_WINDOW_VALUES)
export type TelemetryWindow = z.infer<typeof telemetryWindowSchema>

export const telemetryCategorySummarySchema = z.object({
  count: z.number().int().nonnegative(),
  lastEventAt: z.string().datetime().optional(),
})
export type TelemetryCategorySummary = z.infer<typeof telemetryCategorySummarySchema>

export const topEventSchema = z.object({
  name: z.string().min(1),
  count: z.number().int().nonnegative(),
})
export type TopEvent = z.infer<typeof topEventSchema>

export const projectTelemetrySummarySchema = z.object({
  window: telemetryWindowSchema,
  categories: z.record(telemetryCategorySchema, telemetryCategorySummarySchema),
  topEvents: z.array(topEventSchema).default([]),
})
export type ProjectTelemetrySummary = z.infer<typeof projectTelemetrySummarySchema>
