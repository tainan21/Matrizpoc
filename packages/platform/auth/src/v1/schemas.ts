/**
 * Zod schemas for the v1 auth contracts.
 *
 * Used by smoke tests (L8) and by storage adapters to validate persisted
 * snapshots before restoring a session. Never imported by UI.
 */
import {
  appIdSchema,
  isoDateStringSchema,
  tenantIdSchema,
  userIdSchema,
  z,
} from "@matriz/foundation-schemas"

export const authUserSchema = z.object({
  id: userIdSchema,
  name: z.string().min(1),
  email: z.string().email(),
})

export const authTenantAccessSchema = z.object({
  tenantId: tenantIdSchema,
  tenantName: z.string().min(1),
  roles: z.array(z.string().min(1)),
  enabledApps: z.array(appIdSchema),
})

export const authIdentitySchema = z.object({
  user: authUserSchema,
  tenants: z.array(authTenantAccessSchema).min(1),
})

export const authSessionSchema = z.object({
  identity: authIdentitySchema,
  activeTenantId: tenantIdSchema,
  issuedAt: isoDateStringSchema,
  expiresAt: isoDateStringSchema,
  strategyId: z.string().min(1),
})
