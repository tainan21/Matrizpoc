import type { InstalledApp, SeumeiAppDefinition } from "../domain/app"
import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"

export type AppAccessDecision =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly error: "app-not-installed" | "permission-denied"
    }

export function authorizeAppAccess(input: {
  readonly context: SeumeiTenantContext
  readonly definition: SeumeiAppDefinition
  readonly installed: InstalledApp | null
}): AppAccessDecision {
  if (
    !input.installed ||
    input.installed.status !== "active" ||
    input.installed.companyId !== input.context.companyId ||
    input.installed.appId !== input.definition.id
  ) {
    return { ok: false, error: "app-not-installed" }
  }
  if (!input.context.permissions.includes(input.definition.requiredPermission)) {
    return { ok: false, error: "permission-denied" }
  }
  return { ok: true }
}
