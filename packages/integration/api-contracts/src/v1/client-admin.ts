import { z } from "zod"

export const clientAdminDataStateSchema = z.enum([
  "fresh",
  "stale",
  "empty",
  "not_configured",
  "unavailable",
  "error",
])

export const clientAdminErrorSchema = z.object({
  code: z.string().min(1).max(80),
  message: z.string().min(1).max(240),
}).nullable()

export const clientAdminSectionSchema = z.object({
  state: clientAdminDataStateSchema,
  asOf: z.string().datetime().nullable(),
  lastSuccessAt: z.string().datetime().nullable(),
  error: clientAdminErrorSchema,
  data: z.unknown(),
}).superRefine((section, context) => {
  if ((section.state === "fresh" || section.state === "stale") && !section.asOf) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["asOf"], message: "Available data requires asOf" })
  }
  if (section.state === "error" && !section.error) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["error"], message: "Error state requires a sanitized error" })
  }
})

export const clientAdminSystemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  purpose: z.string().max(400),
  category: z.enum(["site", "internal_app", "service"]),
  publicUrl: z.string().url().nullable(),
  availability: clientAdminDataStateSchema,
  lastObservedAt: z.string().datetime().nullable(),
})

export const clientAdminIntegrationSchema = z.object({
  id: z.string().min(1),
  provider: z.enum(["vercel", "ga4", "http", "manual", "future"]),
  label: z.string().min(1).max(120),
  state: clientAdminDataStateSchema,
  lastAttemptAt: z.string().datetime().nullable(),
  lastSuccessAt: z.string().datetime().nullable(),
})

export const clientAdminPaymentSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1).max(200),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]),
  dueAt: z.string().datetime(),
  paidAt: z.string().datetime().nullable(),
})

export const clientAdminMetricSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(120),
  value: z.union([z.number(), z.string()]).nullable(),
  unit: z.string().max(24).nullable(),
  state: clientAdminDataStateSchema,
  change: z.number().nullable(),
})

export const clientAdminAttentionSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string().min(1).max(160),
  detail: z.string().min(1).max(320),
  href: z.string().startsWith("/"),
})

export const clientAdminDashboardSchema = z.object({
  tenant: z.object({ id: z.string().min(1), name: z.string().min(1).max(120) }),
  generatedAt: z.string().datetime(),
  metrics: z.array(clientAdminMetricSchema),
  attention: z.array(clientAdminAttentionSchema),
  sections: z.object({
    systems: clientAdminSectionSchema,
    site: clientAdminSectionSchema,
    payments: clientAdminSectionSchema,
    integrations: clientAdminSectionSchema,
  }),
})

export type ClientAdminDataState = z.infer<typeof clientAdminDataStateSchema>
export type ClientAdminSection = z.infer<typeof clientAdminSectionSchema>
export type ClientAdminSystem = z.infer<typeof clientAdminSystemSchema>
export type ClientAdminIntegration = z.infer<typeof clientAdminIntegrationSchema>
export type ClientAdminPayment = z.infer<typeof clientAdminPaymentSchema>
export type ClientAdminMetric = z.infer<typeof clientAdminMetricSchema>
export type ClientAdminAttention = z.infer<typeof clientAdminAttentionSchema>
export type ClientAdminDashboard = z.infer<typeof clientAdminDashboardSchema>
