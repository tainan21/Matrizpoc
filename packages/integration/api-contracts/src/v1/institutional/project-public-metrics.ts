/**
 * ProjectPublicMetrics (v1, institutional).
 *
 * Metricas publicas seguras para superficie publica. Domain-free.
 */
import { z } from "zod"

export const customMetricSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  unit: z.string().optional(),
})
export type CustomMetric = z.infer<typeof customMetricSchema>

export const projectPublicMetricsSchema = z.object({
  activeUsers: z.number().int().nonnegative().optional(),
  reach: z.number().int().nonnegative().optional(),
  publishedItems: z.number().int().nonnegative().optional(),
  lastActivityAt: z.string().datetime().optional(),
  customMetrics: z.array(customMetricSchema).default([]),
})
export type ProjectPublicMetrics = z.infer<typeof projectPublicMetricsSchema>
