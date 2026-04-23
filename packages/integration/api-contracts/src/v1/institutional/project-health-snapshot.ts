/**
 * ProjectHealthSnapshot (v1, institutional).
 *
 * Saude operacional no momento da ingestao. Domain-free.
 */
import { z } from "zod"

export const HEALTH_STATUS_VALUES = [
  "healthy",
  "degraded",
  "offline",
  "unknown",
] as const

export const healthStatusSchema = z.enum(HEALTH_STATUS_VALUES)
export type HealthStatus = z.infer<typeof healthStatusSchema>

export const CHECK_STATUS_VALUES = ["pass", "warn", "fail"] as const
export const checkStatusSchema = z.enum(CHECK_STATUS_VALUES)
export type CheckStatus = z.infer<typeof checkStatusSchema>

export const UPTIME_WINDOW_VALUES = ["24h", "7d", "30d"] as const
export const uptimeWindowSchema = z.enum(UPTIME_WINDOW_VALUES)
export type UptimeWindow = z.infer<typeof uptimeWindowSchema>

export const healthCheckSchema = z.object({
  name: z.string().min(1),
  status: checkStatusSchema,
  detail: z.string().optional(),
})
export type HealthCheck = z.infer<typeof healthCheckSchema>

export const projectHealthSnapshotSchema = z.object({
  status: healthStatusSchema,
  readinessScore: z.number().int().min(0).max(100),
  lastCheckAt: z.string().datetime(),
  checks: z.array(healthCheckSchema).default([]),
  uptimeWindow: uptimeWindowSchema.optional(),
  uptimePercent: z.number().min(0).max(100).optional(),
})
export type ProjectHealthSnapshot = z.infer<typeof projectHealthSnapshotSchema>
