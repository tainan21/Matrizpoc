import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import type { InstalledApp, SeumeiAppId } from "./app"

export interface InstalledAppRepository {
  list(context: SeumeiTenantContext): Promise<readonly InstalledApp[]>
  find(
    context: SeumeiTenantContext,
    appId: SeumeiAppId,
  ): Promise<InstalledApp | null>
}
