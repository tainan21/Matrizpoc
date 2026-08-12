import { getHubPageRequestContext } from "../../../auth/page-context"
import type { DocsActorContext } from "../domain/types"

/** Server Component boundary for tenant-owned MatrizDocs pages. */
export async function getDocsPageActorContext(): Promise<DocsActorContext> {
  const context = await getHubPageRequestContext()
  return { tenantId: context.session.activeTenantId, actorId: context.session.identity.user.id, actorType: "human_user", displayName: context.session.identity.user.name }
}
