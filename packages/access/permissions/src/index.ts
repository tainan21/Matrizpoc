/**
 * @matriz/access-permissions
 *
 * Very small authorization model for the POC. Apps declare capability strings
 * in their manifests (L2). Permissions map tenants/users to a set of allowed
 * capabilities. No real ACL engine — just a deterministic mock check.
 *
 * L12: no app-specific capabilities hardcoded here; callers pass them as
 * strings.
 */
import type { UserId, TenantId } from "@matriz/foundation-types"

export const ACCESS_PERMISSIONS_VERSION = "0.1.0" as const

export type Capability = string

export interface PermissionGrant {
  readonly userId: UserId
  readonly tenantId: TenantId
  readonly capabilities: readonly Capability[]
}

export interface PermissionChecker {
  can(
    userId: UserId,
    tenantId: TenantId,
    capability: Capability,
  ): boolean
}

export function createPermissionChecker(
  grants: readonly PermissionGrant[],
): PermissionChecker {
  return {
    can(userId, tenantId, capability) {
      const g = grants.find(
        (x) => x.userId === userId && x.tenantId === tenantId,
      )
      if (!g) return false
      return g.capabilities.includes(capability) || g.capabilities.includes("*")
    },
  }
}
